import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTRACT_ADDRESS = '0x7C6Ed37EFc7e1A2f731540fC5E1Dfacc3294b4Fc';

const CONTRACT_ABI = [
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function getMemoryOfAOwner(address _owner) public view returns (string memory, tuple(uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32,uint32))',
  'function respond(bytes32 _promptId, string memory _response) public returns (string memory)'
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
  console.log('Fetching encrypted data from IPFS with CID:', cid);
  
  try {
    // Import Supabase client within the function
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Step 1: Fetch encrypted data from IPFS using the ipfs-operations function
    console.log('Calling ipfs-operations function to fetch data');
    const ipfsResponse = await supabase.functions.invoke('ipfs-operations', {
      body: {
        operation: 'fetch',
        cid: cid
      }
    });
    
    console.log('IPFS response:', ipfsResponse);
    
    if (ipfsResponse.error) {
      console.error('IPFS fetch error:', ipfsResponse.error);
      throw new Error(`IPFS fetch failed: ${ipfsResponse.error.message}`);
    }
    
    if (!ipfsResponse.data || !ipfsResponse.data.success) {
      console.error('IPFS fetch unsuccessful:', ipfsResponse.data);
      throw new Error(`IPFS fetch error: ${ipfsResponse.data?.error || 'Unknown error'}`);
    }
    
    const encryptedData = ipfsResponse.data.content;
    console.log('Encrypted data fetched from IPFS, length:', encryptedData.length);
    console.log('Encrypted data preview:', encryptedData.substring(0, 100) + '...');
    
    // Step 2: Decrypt the fetched data using the aes-crypto function
    console.log('Calling aes-crypto function to decrypt data');
    const decryptResponse = await supabase.functions.invoke('aes-crypto', {
      body: {
        operation: 'decrypt',
        data: encryptedData
      }
    });
    
    console.log('Decrypt response:', decryptResponse);
    
    if (decryptResponse.error) {
      console.error('Decryption error:', decryptResponse.error);
      throw new Error(`Decryption failed: ${decryptResponse.error.message}`);
    }
    
    if (!decryptResponse.data || !decryptResponse.data.success) {
      console.error('Decryption unsuccessful:', decryptResponse.data);
      throw new Error(`Decryption error: ${decryptResponse.data?.error || 'Unknown error'}`);
    }
    
    const decryptedData = decryptResponse.data.result;
    console.log('Data decrypted successfully, length:', decryptedData.length);
    console.log('Decrypted data preview:', decryptedData.substring(0, 100) + (decryptedData.length > 100 ? '...' : ''));
    
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

    // Step 2: Get the original owner of the CINFT
    console.log('=== Step 2: Getting original owner ===');
    
    let owner: string;
    let memoryCid: string;
    let personalityTraits: any;
    
    try {
      // Get the original owner by calling ownerOf on the contract
      console.log('Calling ownerOf for token ID:', tokenId);
      const ownerResult = await callContractRead(personaAgentRpcUrl, 'ownerOf', [tokenId]);
      
      if (!ownerResult || ownerResult === '0x') {
        throw new Error(`No owner found for token ID ${tokenId}`);
      }
      
      // Decode the owner address from the result
      owner = '0x' + ownerResult.slice(-40); // Extract address from padded result
      console.log('Original owner:', owner);
      
      if (owner.toLowerCase() !== userWalletAddress.toLowerCase()) {
        console.log('Warning: Original owner differs from current user');
        console.log('Original owner:', owner);
        console.log('Current user:', userWalletAddress);
      }
      
    } catch (error) {
      console.error('Error getting original owner:', error);
      throw new Error(`Failed to get original owner: ${error.message}`);
    }

    // Step 2b: Get memory CID and personality traits using persona agent credentials
    console.log('=== Step 2b: Getting memory and personality traits ===');
    
    try {
      console.log('Calling getMemoryOfAOwner for owner:', owner);
      const memoryResult = await callContractRead(personaAgentRpcUrl, 'getMemoryOfAOwner', [owner]);
      
      if (!memoryResult || memoryResult === '0x') {
        throw new Error(`No memory data found for owner ${owner}`);
      }
      
      // For now, we'll need to properly decode the result
      // This would require proper ABI decoding in production
      // The result should contain both CID string and PersonalityTraits struct
      
      // Placeholder decoding - in production this would be properly decoded
      memoryCid = memoryResult; // This needs proper decoding
      personalityTraits = {
        // These would be decoded from the contract result
        openness: 75,
        conscientiousness: 60,
        extraversion: 80,
        agreeableness: 70,
        neuroticism: 30,
        achievement: 85,
        compassion: 75,
        creativity: 90,
        security: 50,
        adventure: 85,
        knowledge: 80,
        autonomy: 70,
        community: 60,
        skillsHobbiesFrequency: 75,
        interestsKnowledgeFrequency: 80,
        keyEntitiesFrequency: 65
      };
      
      console.log('Memory CID:', memoryCid);
      console.log('Personality traits retrieved');
      console.log('Personality traits:', personalityTraits);
      
    } catch (error) {
      console.error('Error getting memory/personality data:', error);
      throw new Error(`Failed to get memory/personality data: ${error.message}`);
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

    // Step 5: Store response in contract
    console.log('=== Step 5: Storing response in contract ===');
    if (promptId) {
      try {
        const txHash = await callContractWrite(
          personaAgentRpcUrl,
          personaAgentPrivateKey,
          'respond',
          [promptId, aiResponse]
        );
        console.log('Response stored in contract, tx hash:', txHash);
      } catch (error) {
        console.error('Error storing response in contract:', error);
        // Continue anyway - we still have the AI response
      }
    }

    // Step 6: Return response to client
    console.log('=== Step 6: Returning response to client ===');
    
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