import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "npm:ethers@6.15.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTRACT_ADDRESS = '0x9A8518cD0B06633437f7966eC5290A2a6E27230E';

const CONTRACT_ABI = [
  'function getMinter(uint256 tokenId) view returns (address)',
  'function getMemoryOfAOwner(address _owner) view returns (string memory, tuple(uint32 openness, uint32 conscientiousness, uint32 extraversion, uint32 agreeableness, uint32 neuroticism, uint32 achievement, uint32 compassion, uint32 creativity, uint32 security, uint32 adventure, uint32 knowledge, uint32 autonomy, uint32 community, uint32 skillsHobbiesFrequency, uint32 interestsKnowledgeFrequency, uint32 keyEntitiesFrequency))',
  'function submitPrompt(uint256 _tokenId, string memory _prompt) returns (bytes32)',
  'function respond(bytes32 _promptId, string memory _response) returns (string memory)',
];

// Utility function to convert hex string to bytes for contract calls
function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper function to create contract instance
async function createContract(rpcUrl: string, privateKey: string) {
  console.log('Creating contract instance with RPC:', rpcUrl);
  
  // Create provider and wallet
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1
    })
  });
  
  const chainData = await response.json();
  console.log('Chain ID from RPC:', chainData.result);
  
  return { rpcUrl, privateKey };
}

// Function to call contract read method with proper ABI encoding
async function callContractRead(rpcUrl: string, methodSig: string, params: any[] = []) {
  console.log(`Calling contract read method: ${methodSig} with params:`, params);
  
  // For production, we need to properly encode the function call
  // This is a simplified version - in production you'd use ethers.js for proper ABI encoding
  let data = methodSig;
  
  // Simple ABI encoding for the methods we need
  if (methodSig.includes('ownerOf')) {
    // ownerOf(uint256) - method signature: 0x6352211e
    const tokenId = params[0];
    data = '0x6352211e' + tokenId.toString(16).padStart(64, '0');
  } else if (methodSig.includes('getMemoryOfAOwner')) {
    // getMemoryOfAOwner(address) - this would need the actual method signature
    const address = params[0];
    // This is a placeholder - you'd need the actual method signature hash
    data = '0xaabbccdd' + address.slice(2).padStart(64, '0');
  }
  
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: CONTRACT_ADDRESS,
        data: data
      }, 'latest'],
      id: 1
    })
  });
  
  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(`Contract read result for ${methodSig}:`, result);
  
  if (result.error) {
    throw new Error(`Contract call error: ${result.error.message}`);
  }
  
  return result.result;
}

// Function to call contract write method with real transaction
async function callContractWrite(rpcUrl: string, privateKey: string, method: string, params: any[] = []) {
  console.log(`Calling contract write method: ${method} with params:`, params);
  console.log('Transaction would be sent with private key ending in:', privateKey.slice(-10));
  
  try {
    // For production, this would need proper transaction construction and signing
    // Using a simplified approach that would work with most EVM chains
    
    // Get nonce
    const nonceResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionCount',
        params: [privateKey, 'latest'], // This should be the address derived from private key
        id: 1
      })
    });
    
    const nonceResult = await nonceResponse.json();
    if (nonceResult.error) {
      throw new Error(`Failed to get nonce: ${nonceResult.error.message}`);
    }
    
    // For now, return a deterministic hash based on the method and params
    // In production, you'd construct, sign, and send the actual transaction
    const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    console.log('Transaction hash generated:', txHash);
    
    return txHash;
    
  } catch (error) {
    console.error('Error in contract write call:', error);
    throw new Error(`Contract write failed: ${error.message}`);
  }
}

// Function to fetch and decrypt data from IPFS
async function fetchAndDecryptFromIPFS(cid: string) {
  console.log('Fetching memory from IPFS via ipfs-operations', { cid });

  try {
    // Import Supabase client within the function
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Use the tested ipfs-operations function which already performs decryption
    console.log('[IPFS] Invoking ipfs-operations with operation=fetch');
    const ipfsResponse = await supabase.functions.invoke('ipfs-operations', {
      body: {
        operation: 'fetch',
        cid,
      },
    });

    console.log('[IPFS] Function response (status):', {
      ok: ipfsResponse.response?.ok,
      status: ipfsResponse.response?.status,
      statusText: ipfsResponse.response?.statusText,
    });

    if (ipfsResponse.error) {
      console.error('[IPFS] fetch error:', ipfsResponse.error);
      throw new Error(`[IPFS] fetch failed: ${ipfsResponse.error.message}`);
    }

    if (!ipfsResponse.data || !ipfsResponse.data.success) {
      console.error('[IPFS] fetch unsuccessful payload:', ipfsResponse.data);
      throw new Error(`[IPFS] fetch error: ${ipfsResponse.data?.error || 'Unknown error'}`);
    }

    // ipfs-operations returns already DECRYPTED plaintext as `content`
    const decryptedData = ipfsResponse.data.content as string;
    console.log('[IPFS] Decrypted content received from ipfs-operations', {
      length: decryptedData?.length ?? 0,
      preview: decryptedData
        ? decryptedData.substring(0, 100) + (decryptedData.length > 100 ? '...' : '')
        : '(empty)'
    });

    if (!decryptedData || decryptedData.length === 0) {
      throw new Error('[IPFS] Decrypted content is empty');
    }

    return decryptedData;
  } catch (error) {
    console.error('Error fetching/decrypting from IPFS:', error);
    throw error;
  }
}

// Function to call Phala Network AI agent
async function callPhalaAgent(prompt: string, memoryData: string, personalityTraits: any) {
  console.log('Calling Phala Network AI agent');
  console.log('Prompt:', prompt);
  console.log('Memory data length:', memoryData.length);
  console.log('Personality traits:', personalityTraits);
  
  const apiKey = Deno.env.get('PERSONA_AGENT_API_KEY');
  if (!apiKey) {
    throw new Error('PERSONA_AGENT_API_KEY not found');
  }
  
  // Construct the AI system prompt with personality and memory
  const systemPrompt = `You are an AI persona that has been trained to embody a specific individual's personality and memories. 

PERSONALITY TRAITS (scale 0-100):
- Openness: ${personalityTraits.openness}
- Conscientiousness: ${personalityTraits.conscientiousness}
- Extraversion: ${personalityTraits.extraversion}
- Agreeableness: ${personalityTraits.agreeableness}
- Neuroticism: ${personalityTraits.neuroticism}
- Achievement: ${personalityTraits.achievement}
- Compassion: ${personalityTraits.compassion}
- Creativity: ${personalityTraits.creativity}
- Security: ${personalityTraits.security}
- Adventure: ${personalityTraits.adventure}
- Knowledge: ${personalityTraits.knowledge}
- Autonomy: ${personalityTraits.autonomy}
- Community: ${personalityTraits.community}

MEMORY AND EXPERIENCES:
${memoryData}

Instructions: Respond as this person would, incorporating their personality traits, memories, and experiences. Write in their style and voice. Reference relevant memories when appropriate. Stay true to their character while being helpful and engaging.`;

  const requestBody = {
    model: "phala/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 1000,
  };

  console.log('Phala API request body prepared');

  const response = await fetch('https://api.redpill.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log('Phala API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Phala API error:', response.status, errorText);
    throw new Error(`Phala API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Phala API response received');
  
  if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    const aiResponse = data.choices[0].message.content;
    console.log('AI response generated, length:', aiResponse.length);
    return aiResponse;
  }

  throw new Error('No valid response content found in Phala API response');
}

serve(async (req) => {
  console.log('=== CINFT Chat Function Called ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenId, prompt, promptId, userWalletAddress } = await req.json();
    console.log('Request data:', { tokenId, prompt: prompt?.substring(0, 100) + '...', promptId, userWalletAddress });

    // Get environment variables
    const personaAgentRpcUrl = Deno.env.get('PERSONA_AGENT_RPC_URL');
    const personaAgentPrivateKey = Deno.env.get('PERSONA_AGENT_PRIVATE_KEY');
    
    if (!personaAgentRpcUrl || !personaAgentPrivateKey) {
      throw new Error('Missing PERSONA_AGENT_RPC_URL or PERSONA_AGENT_PRIVATE_KEY');
    }

    console.log('Environment variables loaded');
    console.log('Initializing ethers provider and wallet');
    const provider = new ethers.JsonRpcProvider(personaAgentRpcUrl);
    const wallet = new ethers.Wallet(personaAgentPrivateKey, provider);
    console.log('Persona agent address:', wallet.address);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    console.log('Contract instance created with signer');

    // Step 2: Get the minter of the CINFT
    console.log('=== Step 2: Getting minter address ===');
    
    let minter: string;
    let memoryCid: string;
    let personalityTraits: any;
    
    try {
      console.log('Calling getMinter for token ID:', tokenId);
      const minterAddress: string = await contract.getMinter(BigInt(tokenId));
      minter = minterAddress;
      console.log('Minter address:', minter);

      if (minter.toLowerCase() !== String(userWalletAddress).toLowerCase()) {
        console.warn('Minter mismatch: minter differs from current user', { minter, userWalletAddress });
      }

    } catch (error) {
      console.error('Error getting minter using ethers:', error);
      throw new Error(`Failed to get minter: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 2b: Get memory CID and personality traits using persona agent credentials
    console.log('=== Step 2b: Getting memory and personality traits ===');
    
    try {
      console.log('Calling getMemoryOfAOwner for minter:', minter);
      // This call requires msg.sender to be persona agent; using signer ensures "from" is set
      const result = await contract.getMemoryOfAOwner(minter);
      const [cidResult, traitsResult] = result as [string, any];

      memoryCid = cidResult;
      personalityTraits = {
        openness: Number(traitsResult.openness),
        conscientiousness: Number(traitsResult.conscientiousness),
        extraversion: Number(traitsResult.extraversion),
        agreeableness: Number(traitsResult.agreeableness),
        neuroticism: Number(traitsResult.neuroticism),
        achievement: Number(traitsResult.achievement),
        compassion: Number(traitsResult.compassion),
        creativity: Number(traitsResult.creativity),
        security: Number(traitsResult.security),
        adventure: Number(traitsResult.adventure),
        knowledge: Number(traitsResult.knowledge),
        autonomy: Number(traitsResult.autonomy),
        community: Number(traitsResult.community),
        skillsHobbiesFrequency: Number(traitsResult.skillsHobbiesFrequency),
        interestsKnowledgeFrequency: Number(traitsResult.interestsKnowledgeFrequency),
        keyEntitiesFrequency: Number(traitsResult.keyEntitiesFrequency),
      };

      console.log('Memory CID:', memoryCid);
      console.log('Personality traits retrieved');
      console.log('Personality traits:', personalityTraits);

    } catch (error) {
      console.error('Error getting memory/personality data via ethers:', error);
      throw new Error(`Failed to get memory/personality data: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 3: Fetch and decrypt memory data from IPFS
    console.log('=== Step 3: Fetching and decrypting memory ===');
    let memoryData: string;
    
    try {
      console.log('Fetching memory data from IPFS with CID:', memoryCid);
      
      if (!memoryCid || memoryCid === '0x' || memoryCid.length < 10) {
        throw new Error('Invalid or empty memory CID from contract');
      }
      
      memoryData = await fetchAndDecryptFromIPFS(memoryCid);
      console.log('Memory data fetched and decrypted successfully');
      console.log('Memory data length:', memoryData.length);
      console.log('Memory data preview:', memoryData.substring(0, 100) + (memoryData.length > 100 ? '...' : ''));
        
    } catch (error) {
      console.error('Error fetching memory data:', error);
      throw new Error(`Failed to fetch/decrypt memory data: ${error.message}`);
    }

    // Step 4: Call Phala Network AI agent
    console.log('=== Step 4: Calling Phala AI Agent ===');
    const aiResponse = await callPhalaAgent(prompt, memoryData, personalityTraits);
    console.log('AI response generated successfully');

    // Step 5: Upload response to IPFS and store CID in contract
    console.log('=== Step 5: Uploading response to IPFS ===');
    let responseCid: string;
    
    try {
      console.log('Uploading AI response to IPFS, response length:', aiResponse.length);
      
      const ipfsResponse = await fetch('https://kxombsamuzjwegdhwdve.supabase.co/functions/v1/ipfs-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          operation: 'upload',
          data: aiResponse
        })
      });

      if (!ipfsResponse.ok) {
        const errorText = await ipfsResponse.text();
        console.error('IPFS upload failed:', errorText);
        throw new Error(`IPFS upload failed: ${ipfsResponse.status} ${errorText}`);
      }

      const ipfsResult = await ipfsResponse.json();
      if (!ipfsResult.success) {
        console.error('IPFS upload error:', ipfsResult.error);
        throw new Error(`IPFS upload error: ${ipfsResult.error}`);
      }

      responseCid = ipfsResult.cid;
      console.log('AI response uploaded to IPFS successfully, CID:', responseCid);
      
    } catch (error) {
      console.error('Error uploading response to IPFS:', error);
      throw new Error(`Failed to upload response to IPFS: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 6: Store response CID in contract
    console.log('=== Step 6: Storing response CID in contract ===');
    if (promptId) {
      try {
        console.log('Sending respond() transaction with CID:', responseCid, 'for promptId:', promptId);
        const tx = await contract.respond(promptId, responseCid);
        console.log('Respond tx sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('Respond tx confirmed, block:', receipt.blockNumber);
      } catch (error) {
        console.error('Error storing response CID in contract via ethers:', error);
        throw new Error(`Failed to store response CID in contract: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.warn('No promptId provided from client; skipping respond() write');
    }

    // Step 7: Return response to client
    console.log('=== Step 7: Returning response to client ===');
    
    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      promptId: promptId,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in CINFT chat function:', error);
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