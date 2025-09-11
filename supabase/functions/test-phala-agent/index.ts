import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== EDGE FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Test 1: Basic function working
    console.log('Test 1: Basic function execution - OK');
    
    // Test 2: Environment variable access
    const apiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    console.log('Test 2: API Key check:', apiKey ? `Found (${apiKey.length} chars, starts with ${apiKey.substring(0, 4)}...)` : 'NOT FOUND');
    
    if (!apiKey) {
      throw new Error('TRAITS_AGENT_API_KEY not found in environment variables');
    }
    
    // Test 3: Try a simple fetch to the Phala API to test connectivity
    console.log('Test 3: Testing basic connectivity to Phala API...');
    
    const testResponse = await fetch('https://api.redpill.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('API Response status:', testResponse.status);
    console.log('API Response headers:', Object.fromEntries(testResponse.headers.entries()));
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log('API Error response:', errorText);
      throw new Error(`API request failed: ${testResponse.status} ${testResponse.statusText} - ${errorText}`);
    }
    
    const modelsData = await testResponse.text(); // Get as text first to see what we receive
    console.log('Models response (first 200 chars):', modelsData.substring(0, 200));
    
    // Test 4: Try actual chat completion with raw fetch
    console.log('Test 4: Testing chat completion with raw fetch...');
    
    const chatResponse = await fetch('https://api.redpill.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'phala/deepseek-chat-v3-0324',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Phala!" and nothing else.',
          },
        ],
        max_tokens: 20,
      }),
    });
    
    console.log('Chat response status:', chatResponse.status);
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.log('Chat API Error response:', errorText);
      throw new Error(`Chat API request failed: ${chatResponse.status} ${chatResponse.statusText} - ${errorText}`);
    }
    
    const chatData = await chatResponse.json();
    console.log('Chat response:', JSON.stringify(chatData, null, 2));
    
    const result = {
      success: true,
      tests_passed: ['basic_function', 'api_key_found', 'api_connectivity', 'chat_completion'],
      api_key_length: apiKey.length,
      models_response_preview: modelsData.substring(0, 100),
      chat_response: chatData,
      timestamp: new Date().toISOString()
    };

    console.log('=== ALL TESTS PASSED ===');
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR OCCURRED ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    const errorResult = {
      success: false,
      error: error.message,
      error_name: error.name,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});