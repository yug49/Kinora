import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('Edge function starting...');

serve(async (req) => {
  console.log('Request received:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Phala agent API test...');
    
    // Get the API key from environment
    const apiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    console.log('API key check:', apiKey ? 'found' : 'missing');
    
    if (!apiKey) {
      console.error('TRAITS_AGENT_API_KEY not found in environment');
      throw new Error('API key not configured');
    }
    
    console.log('API key found, length:', apiKey.length);
    console.log('API key preview:', apiKey.substring(0, 8) + '...');
    
    // Initialize OpenAI client with Phala network endpoint
    console.log('Initializing OpenAI client...');
    const openai = new OpenAI({
      baseURL: 'https://api.redpill.ai/api/v1',
      apiKey: apiKey,
    });
    
    console.log('Making API call to Phala agent...');
    console.log('Base URL: https://api.redpill.ai/api/v1');
    console.log('Model: phala/deepseek-chat-v3-0324');
    
    // Make the API call with the correct model from official Phala docs
    const completion = await openai.chat.completions.create({
      model: 'phala/deepseek-chat-v3-0324',
      messages: [
        {
          role: 'user',
          content: 'What is the meaning of life? Please answer in one sentence.',
        },
      ],
      max_tokens: 50, // Limit tokens to keep costs low
    });
    
    console.log('API call successful!');
    console.log('Response received:', completion ? 'yes' : 'no');
    
    if (completion && completion.choices && completion.choices[0]) {
      console.log('Message content:', completion.choices[0].message.content);
      
      const result = {
        success: true,
        message: completion.choices[0].message,
        model: 'phala/deepseek-chat-v3-0324',
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('Invalid response structure:', completion);
      throw new Error('Invalid response from API');
    }

  } catch (error) {
    console.error('Error in Phala agent test:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error status:', error.status);
    
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }

    let errorMessage = error.message || 'Unknown error';
    let suggestions = [];
    let status = error.status || 'unknown';

    // Provide specific guidance based on error type
    if (error.status === 404) {
      errorMessage = 'API endpoint not found - check API key and model name';
      suggestions = [
        'Verify your Phala API key is correct',
        'Ensure you have sufficient funds ($5+) in your Phala account',
        'Check that GPU TEE API is enabled in your dashboard'
      ];
    } else if (error.status === 401 || error.status === 403) {
      errorMessage = 'Authentication failed - invalid API key';
      suggestions = [
        'Get API key from Phala Dashboard → Confidential AI API',
        'Ensure the TRAITS_AGENT_API_KEY secret is properly set'
      ];
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded or insufficient credits';
      suggestions = [
        'Wait before retrying',
        'Add more funds to your Phala account'
      ];
    }

    const errorResult = {
      success: false,
      error: errorMessage,
      originalError: error.message,
      status: status,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    };

    console.log('Returning error response:', errorResult);

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

console.log('Edge function setup complete');