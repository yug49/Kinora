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
    // The incoming request body is expected to be: { "message": { "new": "...", "old": [...] } }
    // We rename `message` to `userInput` for clarity.
    const { message: userInput } = await req.json();
    console.log('Received user input:', userInput);
    
    const apiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    if (!apiKey) {
      throw new Error('TRAITS_AGENT_API_KEY not found');
    }

    // --- MODIFICATION START ---
    // Construct the detailed, instruction-tuned prompt for the AI agent.
    const fullPromptContent = `You are a hyper-efficient, specialized analysis engine named TraitExtractor. Your sole purpose is to process a user's memory content and output a raw JSON object. You are a machine; you do not engage in conversation, provide explanations, or use natural language. Your entire response is always and only a single, valid, raw JSON object.

---
INSTRUCTIONS:
Analyze the content provided under "Content to Process" and generate a single raw JSON object as your entire response.

RULES:
1.  **Output Format**: Your entire output must be a single, raw JSON object starting with { and ending with }.
2.  **No Extra Text**: DO NOT include markdown, introductions, explanations, apologies, or any text whatsoever outside of the JSON structure. Your response must be machine-readable raw text.
3.  **personality_traits Object**: This object must contain exactly 16 keys. The value for each key must be either the string "yes" or the string "no".
4.  **core_memories Array**: This array must contain strings. You will curate this list based on the following logic:
    *   **Significance is Key**: Identify memories that represent major life events, strong emotions, key relationships, achievements, or moments of profound insight.
    *   **Preserve Style**: Retain the user's original phrasing, grammar, and tone from the memory snippets. This is crucial for impersonation later.
    *   **50 Memory Limit**: The final array must not contain more than 50 entries.
    *   **Curation Logic**: If the new memory is more significant than the least important memory in the old list (which is already at 50), you must replace the least important one. If the new memory is mundane and the list is full, discard the new memory. Otherwise, add the new memory to the list.

JSON OUTPUT STRUCTURE:
\`\`\`json
{
  "personality_traits": {
    "openness": "yes/no",
    "conscientiousness": "yes/no",
    "extraversion": "yes/no",
    "agreeableness": "yes/no",
    "neuroticism": "yes/no",
    "achievement": "yes/no",
    "compassion": "yes/no",
    "creativity": "yes/no",
    "security": "yes/no",
    "adventure": "yes/no",
    "knowledge": "yes/no",
    "autonomy": "yes/no",
    "community": "yes/no",
    "skillsHobbiesFrequency": "yes/no",
    "interestsKnowledgeFrequency": "yes/no",
    "keyEntitiesFrequency": "yes/no"
  },
  "core_memories": [
    "string of core memory 1...",
    "string of core memory 2...",
    "... up to 50 memories"
  ]
}
\`\`\`

---
Content to Process:
${JSON.stringify(userInput)}
`;

    const requestBody = {
      model: "phala/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: fullPromptContent, // Use the new, detailed prompt
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

    // --- MODIFICATION START ---
    // The AI's response is expected to be a raw JSON string. We parse it here
    // so the frontend receives a clean, usable JSON object.
    let finalResponseData;
    try {
        finalResponseData = JSON.parse(aiResponseString);
    } catch (parseError) {
        console.error("AI response was not valid JSON. Returning raw string for debugging.", parseError);
        // If parsing fails, send back the raw string so you can see what went wrong.
        finalResponseData = { error: "AI response was not valid JSON", rawResponse: aiResponseString };
    }
    // --- MODIFICATION END ---

    return new Response(JSON.stringify({
      success: true,
      response: finalResponseData, // Send the parsed JSON object
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