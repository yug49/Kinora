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
    const { message } = await req.json();
    console.log('Received message:', message);
    
    const apiKey = Deno.env.get('TRAITS_AGENT_API_KEY');
    if (!apiKey) {
      throw new Error('TRAITS_AGENT_API_KEY not found');
    }

    // Make request to Phala agent
    const response = await fetch('https://api.phala.network/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        model: 'gpt-4',
        temperature: 0.7,
      }),
    });

    console.log('Phala API response status:', response.status);
    console.log('Phala API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Phala API error:', response.status, errorText);
      throw new Error(`Phala API error: ${response.status} - ${errorText}`);
    }

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();
    console.log('Phala raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Phala parsed response:', data);
    } catch (jsonError) {
      console.error('Failed to parse JSON response:', jsonError);
      console.error('Raw response was:', responseText);
      
      // If it's not JSON, treat the text as the response
      return new Response(JSON.stringify({
        success: true,
        response: responseText || 'Empty response from agent',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      response: data.response || data.message || data.choices?.[0]?.message?.content || 'No response from agent',
      timestamp: new Date().toISOString()
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