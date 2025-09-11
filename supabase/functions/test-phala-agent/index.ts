import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log('Phala agent function called');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Just test if we can access the API key for now
    const apiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    console.log('API key status:', apiKey ? 'found' : 'missing');
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Basic Phala agent function test',
      api_key_found: !!apiKey,
      api_key_length: apiKey ? apiKey.length : 0,
      timestamp: new Date().toISOString() 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
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