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

// Simple in-memory cache with TTL
interface CacheEntry {
  data: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(cid: string): string | null {
  const entry = cache.get(cid);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    console.log(`Cache expired for CID: ${cid} (age: ${Math.round(age / 1000)}s)`);
    cache.delete(cid);
    return null;
  }
  
  console.log(`Cache hit for CID: ${cid} (age: ${Math.round(age / 1000)}s)`);
  return entry.data;
}

function setCache(cid: string, data: string): void {
  cache.set(cid, {
    data,
    timestamp: Date.now()
  });
  console.log(`Cached data for CID: ${cid}`);
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
      console.log('Uploading data to IPFS - encrypting first...');
      
      // Step 1: Encrypt data using AES crypto function
      const encryptResponse = await fetch('https://kxombsamuzjwegdhwdve.supabase.co/functions/v1/aes-crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pinataJWT}`, // Using JWT for internal auth
        },
        body: JSON.stringify({
          operation: 'encrypt',
          data: data
        })
      });

      if (!encryptResponse.ok) {
        const errorText = await encryptResponse.text();
        console.error('AES encryption failed:', errorText);
        throw new Error(`Encryption failed: ${encryptResponse.status} ${errorText}`);
      }

      const encryptResult = await encryptResponse.json();
      if (!encryptResult.success) {
        console.error('AES encryption error:', encryptResult.error);
        throw new Error(`Encryption error: ${encryptResult.error}`);
      }

      console.log('Data encrypted successfully, original length:', encryptResult.originalLength, 'encrypted length:', encryptResult.encryptedLength);
      
      // Step 2: Create a File object from the encrypted data
      const file = new Blob([encryptResult.result], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file, 'encrypted_data.txt');
      
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
      console.log('Fetching encrypted data from IPFS with CID:', cid);
      
      // Check cache first
      const cachedData = getCached(cid);
      if (cachedData) {
        console.log('Returning cached data for CID:', cid);
        return new Response(
          JSON.stringify({
            success: true,
            content: cachedData,
            cid: cid,
            cached: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      console.log('Cache miss, fetching from IPFS...');
      
      // Step 1: Try multiple gateways, prioritizing dedicated Pinata gateway for immediate access
      const gateways = [
        `https://blush-efficient-cow-673.mypinata.cloud/ipfs/${cid}`, // Dedicated Pinata gateway (immediate access)
        `https://gateway.pinata.cloud/ipfs/${cid}`, // Public Pinata gateway
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`,
      ];

      let encryptedContentText: string | null = null;
      let lastStatus: number | undefined = undefined;
      let lastBody: string = '';

      for (let i = 0; i < gateways.length; i++) {
        const url = gateways[i];
        console.log('Attempting to fetch from gateway:', url);
        const res = await fetch(url);
        console.log('Gateway response status:', res.status);

        if (res.ok) {
          encryptedContentText = await res.text();
          console.log('Fetched encrypted content length:', encryptedContentText.length, 'from', url);
          break;
        } else {
          lastStatus = res.status;
          try { lastBody = await res.text(); } catch { lastBody = ''; }
          console.error('Failed to fetch from IPFS:', res.status, 'gateway:', url);

          // Provide more specific error messages
          if (res.status === 404) {
            throw new Error(`Content not found on IPFS with CID: ${cid}`);
          }

          // Backoff a bit before trying next gateway (helps on transient 429/5xx)
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
          continue;
        }
      }

      if (!encryptedContentText) {
        if (lastStatus === 429) {
          throw new Error(`Rate limit encountered from IPFS gateways. Please try again shortly.`);
        }
        throw new Error(`Failed to fetch from IPFS gateways. Last status: ${lastStatus} - ${lastBody?.slice(0, 200)}`);
      }

      const encryptedContent = encryptedContentText;
      console.log('Fetched encrypted content length:', encryptedContent.length);

      // Step 2: Decrypt the content using AES crypto function
      console.log('Attempting to decrypt content...');
      const decryptResponse = await fetch('https://kxombsamuzjwegdhwdve.supabase.co/functions/v1/aes-crypto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pinataJWT}`, // Using JWT for internal auth
        },
        body: JSON.stringify({
          operation: 'decrypt',
          data: encryptedContent
        })
      });

      if (!decryptResponse.ok) {
        const errorText = await decryptResponse.text();
        console.error('AES decryption failed:', errorText);
        throw new Error(`Decryption failed: ${decryptResponse.status} ${errorText}`);
      }

      const decryptResult = await decryptResponse.json();
      if (!decryptResult.success) {
        console.error('AES decryption error:', decryptResult.error);
        throw new Error(`Decryption error: ${decryptResult.error}`);
      }

      const content = decryptResult.result;
      console.log('Data decrypted successfully, encrypted length:', decryptResult.encryptedLength, 'decrypted length:', decryptResult.decryptedLength);

      // Cache the decrypted content
      setCache(cid, content);

      return new Response(
        JSON.stringify({
          success: true,
          content: content,
          cid: cid,
          cached: false
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