import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTRACT_ADDRESS = '0x9A8518cD0B06633437f7966eC5290A2a6E27230E';
const CONTRACT_ABI = [
  'function fullfillEntry(bytes32 _requestId, string memory _newCid, tuple(bool[8] data) _fullfilmentConfig) public'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting entry fulfillment...');
    
    const { requestId, newCid, personalityTraits } = await req.json();
    console.log('📝 Received fulfillment request');
    console.log('Request ID:', requestId);
    console.log('New CID:', newCid);
    console.log('Personality traits:', personalityTraits);

    // Get agent credentials from environment
    const traitsAgentPrivateKey = Deno.env.get('TRAITS_AGENT_PRIVATE_KEY');
    const traitsAgentRpcUrl = Deno.env.get('TRAITS_AGENT_RPC_URL');
    
    console.log('🔍 Environment check:', {
      hasPrivateKey: !!traitsAgentPrivateKey,
      hasRpcUrl: !!traitsAgentRpcUrl,
      privateKeyLength: traitsAgentPrivateKey?.length || 0,
      rpcUrlLength: traitsAgentRpcUrl?.length || 0
    });
    
    if (!traitsAgentPrivateKey || !traitsAgentRpcUrl) {
      console.error('❌ Missing environment variables:', {
        TRAITS_AGENT_PRIVATE_KEY: !!traitsAgentPrivateKey,
        TRAITS_AGENT_RPC_URL: !!traitsAgentRpcUrl
      });
      throw new Error('TRAITS_AGENT_PRIVATE_KEY or TRAITS_AGENT_RPC_URL not configured');
    }

    console.log('🔗 Connecting to blockchain with traits agent credentials...');
    
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(traitsAgentRpcUrl);
    const wallet = new ethers.Wallet(traitsAgentPrivateKey, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    // Convert personality traits to boolean array
    console.log('🧠 Converting personality traits to boolean array...');
    const traitsArray = [
      personalityTraits.openness === 'yes',
      personalityTraits.conscientiousness === 'yes', 
      personalityTraits.extraversion === 'yes',
      personalityTraits.agreeableness === 'yes',
      personalityTraits.neuroticism === 'yes',
      personalityTraits.achievement === 'yes',
      personalityTraits.compassion === 'yes',
      personalityTraits.creativity === 'yes'
    ];

    console.log('Traits array:', traitsArray);

    // Prepare fulfillment config struct
    const fulfillmentConfig = {
      data: traitsArray
    };

    console.log('📞 Calling fullfillEntry contract function...');
    
    // Call fullfillEntry function
    const tx = await contract.fullfillEntry(requestId, newCid, fulfillmentConfig);
    console.log('📋 Transaction sent:', tx.hash);
    
    // Wait for transaction confirmation
    console.log('⏳ Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

    console.log('🎉 Entry fulfillment completed successfully!');

    return new Response(JSON.stringify({
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Entry fulfillment failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});