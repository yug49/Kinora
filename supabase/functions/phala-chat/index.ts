import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log('Phala chat function called');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message: userInput } = await req.json();
    console.log('Received user input:', userInput);
    
    const apiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    if (!apiKey) {
      throw new Error('TRAITS_AGENT_API_KEY not found');
    }

    // --- MODIFICATION START: REVISED AND STRICTER PROMPT ---
    // This new prompt is more direct and includes a one-shot example to force the correct format.
    const fullPromptContent = `You are a data processing API. Your only function is to receive a JSON input and respond with a single, raw JSON object. You are forbidden from using conversational text, markdown, headers, or any characters outside of a valid JSON structure. Your entire response must start with { and end with }.

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
${JSON.stringify(userInput)}
`;

    const requestBody = {
      model: "phala/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: fullPromptContent,
        },
      ],
    };
    // --- MODIFICATION END ---


    console.log('Request body content length:', requestBody.messages[0].content.length);

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
    console.log('Parsed response data:', JSON.stringify(data, null, 2));
    
    let aiResponseString = '';
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      aiResponseString = data.choices[0].message.content;
      console.log('Found response content:', aiResponseString);
    }

    if (!aiResponseString) {
        throw new Error('No valid response content found in agent response');
    }

    let finalResponseData;
    try {
        finalResponseData = JSON.parse(aiResponseString);
    } catch (parseError) {
        console.error("AI response was not valid JSON. Returning raw string for debugging.", parseError);
        finalResponseData = { error: "AI response was not valid JSON", rawResponse: aiResponseString };
    }

    return new Response(JSON.stringify({
      success: true,
      response: finalResponseData,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in phala-chat function:', error);
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