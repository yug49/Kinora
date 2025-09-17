import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTRACT_ADDRESS = '0x35392F4D2859bA37bE04F32082E5f83caE29C1C1';
const CONTRACT_ABI = [
  'function getMemory() public view returns (string memory, tuple(uint32 openness, uint32 conscientiousness, uint32 extraversion, uint32 agreeableness, uint32 neuroticism, uint32 achievement, uint32 compassion, uint32 creativity, uint32 security, uint32 adventure, uint32 knowledge, uint32 autonomy, uint32 community, uint32 skillsHobbiesFrequency, uint32 interestsKnowledgeFrequency, uint32 keyEntitiesFrequency))',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting journal memory processing...');
    
    const { newMemory, userAddress } = await req.json();
    console.log('📝 Step 1 Complete: Received new memory from client');
    console.log('Memory content:', newMemory);
    console.log('User address:', userAddress);

    // Step 2: Fetch CID from contract
    console.log('🔗 Step 2 Started: Fetching CID from smart contract...');
    
    const rpcUrl = Deno.env.get('TRAITS_AGENT_RPC_URL');
    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Call getMemory function for the user's address
    const [cid, personalityTraits] = await contract.getMemory.staticCall({
      from: userAddress
    });
    
    console.log('✅ Step 2 Complete: CID fetched from contract');
    console.log('Retrieved CID:', cid);
    console.log('Personality traits ignored as requested');

    // Step 3: Fetch data from IPFS using CID
    console.log('🌐 Step 3 Started: Fetching old memories from IPFS...');
    
    let oldMemories = '';
    if (cid && cid.trim() !== '') {
      try {
        const pinataJWT = Deno.env.get('PINATA_JWT');
        if (!pinataJWT) {
          throw new Error('PINATA_JWT not configured');
        }

        // Use the ipfs-operations function to fetch and decrypt
        const ipfsResponse = await fetch('https://kxombsamuzjwegdhwdve.supabase.co/functions/v1/ipfs-operations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pinataJWT}`,
          },
          body: JSON.stringify({
            operation: 'fetch',
            cid: cid
          })
        });
        
        if (ipfsResponse.ok) {
          const ipfsResult = await ipfsResponse.json();
          if (ipfsResult.success) {
            oldMemories = ipfsResult.content;
            console.log('✅ Step 3 Complete: Old memories fetched and decrypted from IPFS');
            console.log('Old memories length:', oldMemories.length);
          } else {
            console.log('⚠️ Step 3: IPFS fetch/decrypt failed:', ipfsResult.error);
            oldMemories = '';
          }
        } else {
          console.log('⚠️ Step 3: No existing memories found (empty CID or fetch failed)');
          oldMemories = '';
        }
      } catch (ipfsError) {
        console.error('⚠️ Step 3: IPFS fetch failed:', ipfsError);
        oldMemories = '';
      }
    } else {
      console.log('⚠️ Step 3: No CID found in contract, using empty string for old memories');
    }

    // Step 4: Prepare JSON for Phala agent
    console.log('📋 Step 4 Started: Preparing JSON for Phala agent...');
    
    const agentInput = {
      new: newMemory,
      old: oldMemories
    };
    
    console.log('✅ Step 4 Complete: JSON prepared');
    console.log('Agent input structure:', {
      new: `${newMemory.substring(0, 50)}${newMemory.length > 50 ? '...' : ''}`,
      oldLength: oldMemories.length
    });

    // Step 5: Call Phala chat agent
    console.log('🤖 Step 5 Started: Calling Phala chat agent...');
    
    const traitsApiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    if (!traitsApiKey) {
      throw new Error('TRAITS_AGENT_API_KEY not configured');
    }

    const phalaPrompt = `You are a data processing API. Your only function is to receive a JSON input and respond with a single, raw JSON object. You are forbidden from using conversational text, markdown, headers, or any characters outside of a valid JSON structure. Your entire response must start with { and end with }.

Your task is to analyze the user's 'new' memory and 'old' memories to generate a JSON object with two top-level keys: "personality_traits" and "core_memories".

1.  **personality_traits**: An object with 16 keys. Each key's value must be the string "yes" or "no".
2.  **core_memories**: A JSON array of strings. This array must contain up to 50 of the user's most significant memories, curated from the 'new' and 'old' inputs. The items in the array MUST be strings, not a numbered list.

---
EXAMPLE:
INPUT:
{
  "new": "Finally learned to play 'Blackbird' on the guitar today. My fingers hurt but it was so worth it.",
  "old": ["Graduated from university.", "My proposal to Sarah."]
}

PERFECT OUTPUT:
{
  "personality_traits": {
    "openness": "yes",
    "conscientiousness": "yes",
    "extraversion": "no",
    "agreeableness": "no",
    "neuroticism": "no",
    "achievement": "yes",
    "compassion": "no",
    "creativity": "yes",
    "security": "no",
    "adventure": "no",
    "knowledge": "yes",
    "autonomy": "yes",
    "community": "no",
    "skillsHobbiesFrequency": "yes",
    "interestsKnowledgeFrequency": "no",
    "keyEntitiesFrequency": "no"
  },
  "core_memories": [
    "Finally learned to play 'Blackbird' on the guitar today. My fingers hurt but it was so worth it.",
    "Graduated from university.",
    "My proposal to Sarah."
  ]
}
---

Content to Process:
${JSON.stringify(agentInput)}`;

    const phalaRequestBody = {
      model: "phala/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: phalaPrompt,
        },
      ],
    };

    const phalaResponse = await fetch('https://api.redpill.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${traitsApiKey}`,
      },
      body: JSON.stringify(phalaRequestBody),
    });

    if (!phalaResponse.ok) {
      const errorText = await phalaResponse.text();
      console.error('❌ Step 5 Failed: Phala API error:', phalaResponse.status, errorText);
      throw new Error(`Phala API error: ${phalaResponse.status} - ${errorText}`);
    }

    const phalaData = await phalaResponse.json();
    console.log('✅ Step 5 Complete: Phala agent response received');

    let agentOutput = '';
    if (phalaData.choices && phalaData.choices[0] && phalaData.choices[0].message && phalaData.choices[0].message.content) {
      agentOutput = phalaData.choices[0].message.content;
      console.log('📊 Agent output length:', agentOutput.length);
    } else {
      throw new Error('No valid response content found in Phala agent response');
    }

    // Parse the agent output
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(agentOutput);
      console.log('✅ Agent output successfully parsed as JSON');
    } catch (parseError) {
      console.error('❌ Failed to parse agent output as JSON:', parseError);
      parsedOutput = { error: "Agent response was not valid JSON", rawResponse: agentOutput };
    }

    // Step 6: Store core memories to IPFS
    console.log('💾 Step 6 Started: Storing core memories to IPFS...');
    
    let newCid = '';
    if (parsedOutput.core_memories && Array.isArray(parsedOutput.core_memories)) {
      try {
        const coreMemoriesData = parsedOutput.core_memories.join('\n');
        
        const pinataJWT = Deno.env.get('PINATA_JWT');
        if (!pinataJWT) {
          throw new Error('PINATA_JWT not configured');
        }

        // Use the ipfs-operations function to encrypt and upload
        const ipfsResponse = await fetch('https://kxombsamuzjwegdhwdve.supabase.co/functions/v1/ipfs-operations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pinataJWT}`,
          },
          body: JSON.stringify({
            operation: 'upload',
            data: coreMemoriesData
          })
        });

        if (!ipfsResponse.ok) {
          const errorText = await ipfsResponse.text();
          throw new Error(`IPFS upload failed: ${ipfsResponse.status} ${errorText}`);
        }

        const ipfsResult = await ipfsResponse.json();
        if (!ipfsResult.success) {
          throw new Error(`IPFS upload error: ${ipfsResult.error}`);
        }

        newCid = ipfsResult.cid;
        console.log('✅ Step 6 Complete: Core memories stored to IPFS');
        console.log('New CID:', newCid);
      } catch (ipfsError) {
        console.error('❌ Step 6 Failed: IPFS upload error:', ipfsError);
        throw new Error(`Failed to store core memories to IPFS: ${ipfsError.message}`);
      }
    } else {
      console.log('⚠️ Step 6 Skipped: No valid core_memories found in AI output');
    }

    console.log('🎉 All steps completed successfully!');
    
    return new Response(JSON.stringify({
      success: true,
      result: parsedOutput,
      newCid: newCid,
      metadata: {
        cid: cid,
        newCid: newCid,
        oldMemoriesLength: oldMemories.length,
        newMemoryLength: newMemory.length,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Journal memory processing failed:', error);
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