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

// Function to call contract read method
async function callContractRead(rpcUrl: string, method: string, params: any[] = []) {
  console.log(`Calling contract read method: ${method} with params:`, params);
  
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: CONTRACT_ADDRESS,
        data: method // This would need proper ABI encoding in production
      }, 'latest'],
      id: 1
    })
  });
  
  const result = await response.json();
  console.log(`Contract read result for ${method}:`, result);
  return result.result;
}

// Function to call contract write method
async function callContractWrite(rpcUrl: string, privateKey: string, method: string, params: any[] = []) {
  console.log(`Calling contract write method: ${method} with params:`, params);
  
  // In a production environment, you'd use ethers.js or web3.js to properly construct and sign transactions
  // For now, we'll simulate the transaction
  console.log('Transaction would be sent with private key ending in:', privateKey.slice(-10));
  
  // Return a mock transaction hash
  return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

// Function to fetch and decrypt data from IPFS
async function fetchAndDecryptFromIPFS(cid: string) {
  console.log('Fetching encrypted data from IPFS with CID:', cid);
  
  try {
    // Step 1: Fetch encrypted data from IPFS using the ipfs-operations function
    const ipfsResponse = await fetch(`https://kxombsamuzjwegdhwdve.supabase.co/functions/v1/ipfs-operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'fetch',
        cid: cid
      })
    });
    
    if (!ipfsResponse.ok) {
      throw new Error(`IPFS fetch failed: ${await ipfsResponse.text()}`);
    }
    
    const ipfsData = await ipfsResponse.json();
    console.log('IPFS fetch result:', ipfsData);
    
    if (!ipfsData.success) {
      throw new Error(`IPFS fetch error: ${ipfsData.error}`);
    }
    
    // The ipfs-operations function should already decrypt the data for us
    return ipfsData.content;
    
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
    
    // For now, we'll simulate the contract call since implementing full ethers.js would be complex
    // In production, you'd use ethers.js to properly call the contract
    let owner: string;
    let cid: string;
    let personalityTraits: any;
    
    try {
      // Simulate getting owner - in production this would be a real contract call
      owner = userWalletAddress; // For testing, assume user is the owner
      console.log('Original owner:', owner);
      
      // Simulate getting memory CID and personality traits
      // In production, this would call getMemoryOfAOwner
      cid = "QmTestCID12345"; // Mock CID for testing
      personalityTraits = {
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
      
      console.log('Memory CID:', cid);
      console.log('Personality traits retrieved');
      
    } catch (error) {
      console.error('Error getting owner/memory data:', error);
      throw new Error('Failed to get owner or memory data from contract');
    }

    // Step 3: Fetch and decrypt memory data from IPFS
    console.log('=== Step 3: Fetching and decrypting memory ===');
    let memoryData: string;
    
    try {
      // For testing, we'll use mock data since the CID might not exist
      memoryData = "I love traveling and have visited over 20 countries. My favorite hobby is photography, especially landscape photography. I work as a software engineer and have been coding for over 10 years. I enjoy hiking on weekends and have a pet dog named Max. I'm passionate about technology and always excited to learn new programming languages.";
      console.log('Memory data retrieved (mock data for testing)');
      
      // In production, uncomment this to fetch real data:
      // memoryData = await fetchAndDecryptFromIPFS(cid);
      
    } catch (error) {
      console.error('Error fetching memory data:', error);
      // Use fallback memory data
      memoryData = "I'm an AI persona with unique experiences and memories.";
      console.log('Using fallback memory data');
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