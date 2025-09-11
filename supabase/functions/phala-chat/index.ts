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

    console.log('API Key found, length:', apiKey.length);

    // Make request to Phala agent using the correct API format from docs
    const requestBody = {
      model: "phala/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.redpill.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Phala API response status:', response.status);
    console.log('Phala API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Phala API error:', response.status, errorText);
      throw new Error(`Phala API error: ${response.status} - ${errorText}`);
    }

    // Get the raw response text first
    const responseText = await response.text();
    console.log('Raw response text:', responseText);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.log('Treating response as plain text:', responseText);
      
      return new Response(JSON.stringify({
        success: true,
        response: responseText || 'Empty response from agent',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the message content from the OpenAI-compatible response
    let aiResponse: string = '';

    // Try OpenAI format first (standard format)
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      aiResponse = data.choices[0].message.content;
      console.log('Found response in OpenAI format:', aiResponse);
    }
    // Try other possible formats as fallbacks
    else if (data.response) {
      aiResponse = data.response;
      console.log('Found response in data.response:', aiResponse);
    }
    else if (data.message) {
      aiResponse = data.message;
      console.log('Found response in data.message:', aiResponse);
    }
    else if (data.text) {
      aiResponse = data.text;
      console.log('Found response in data.text:', aiResponse);
    }
    else if (typeof data === 'string') {
      aiResponse = data;
      console.log('Response is a string:', aiResponse);
    }

    if (!aiResponse) {
      console.error('No valid response found in data structure:', data);
      aiResponse = 'No valid response found from agent';
    }

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      debug: {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        firstChoiceKeys: data.choices?.[0] ? Object.keys(data.choices[0]) : [],
        dataKeys: Object.keys(data || {}),
      }
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