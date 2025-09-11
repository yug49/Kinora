import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PinataUploadResponse {
  id: string;
  name: string;
  cid: string;
  created_at: string;
  size: number;
  number_of_files: number;
  mime_type: string;
  group_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('IPFS operations function called');
    
    const { operation, data, cid } = await req.json();
    
    const pinataJWT = Deno.env.get('PINATA_JWT');
    if (!pinataJWT) {
      console.error('PINATA_JWT not found in environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Pinata JWT not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    if (operation === 'upload') {
      console.log('Uploading data to IPFS:', data);
      
      // Create a File object from the text data
      const file = new Blob([data], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file, 'data.txt');
      
      // Add metadata
      const pinataMetadata = JSON.stringify({
        name: `IPFS-Test-${Date.now()}`,
        keyvalues: {
          timestamp: new Date().toISOString(),
        }
      });
      formData.append('pinataMetadata', pinataMetadata);

      const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pinataJWT}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Pinata upload failed:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('Upload successful:', uploadResult);

      return new Response(
        JSON.stringify({
          success: true,
          cid: uploadResult.IpfsHash,
          result: uploadResult
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (operation === 'fetch') {
      console.log('Fetching data from IPFS with CID:', cid);
      
      // Use Pinata's gateway to fetch the content
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      
      const fetchResponse = await fetch(gatewayUrl);
      
      if (!fetchResponse.ok) {
        console.error('Failed to fetch from IPFS:', fetchResponse.status);
        throw new Error(`Failed to fetch: ${fetchResponse.status}`);
      }

      const content = await fetchResponse.text();
      console.log('Fetched content:', content);

      return new Response(
        JSON.stringify({
          success: true,
          content: content,
          cid: cid
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid operation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );

  } catch (error) {
    console.error('IPFS operations error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});