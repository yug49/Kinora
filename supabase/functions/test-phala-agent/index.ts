import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Phala agent API test...');
    
    // Get the API key from environment
    const apiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    if (!apiKey) {
      console.error('TRAITS_AGENT_API_KEY not found in environment');
      throw new Error('API key not configured');
    }
    
    console.log('API key found, initializing OpenAI client...');
    
    // Initialize OpenAI client with Phala network endpoint
    const openai = new OpenAI({
      baseURL: 'https://api.redpill.ai/api/v1',
      apiKey: apiKey,
    });
    
    console.log('Making API call to Phala agent...');
    
    // Make the API call
    const completion = await openai.chat.completions.create({
      model: 'phala/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: 'What is the meaning of life?',
        },
      ],
    });
    
    console.log('API call successful!');
    console.log('Full response:', JSON.stringify(completion, null, 2));
    console.log('Message content:', completion.choices[0].message);
    
    const result = {
      success: true,
      message: completion.choices[0].message,
      fullResponse: completion,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Phala agent test:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    const errorResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});