import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log('AES Crypto function called');
    const { operation, data } = await req.json();
    
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('ENCRYPTION_KEY not found in environment');
      throw new Error('Encryption key not configured');
    }

    console.log(`Operation: ${operation}`);
    console.log(`Data length: ${data?.length || 0}`);

    if (operation === 'encrypt') {
      console.log('Starting encryption process');
      
      // Generate a random IV (16 bytes for AES)
      const iv = crypto.getRandomValues(new Uint8Array(16));
      console.log('Generated IV:', Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''));
      
      // Import the key for AES-GCM
      const keyBuffer = new TextEncoder().encode(encryptionKey.slice(0, 32)); // Ensure 32 bytes
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // Encrypt the data
      const dataBuffer = new TextEncoder().encode(data);
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        cryptoKey,
        dataBuffer
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Convert to base64
      const encryptedBase64 = btoa(String.fromCharCode(...combined));
      console.log('Encryption successful, result length:', encryptedBase64.length);
      
      return new Response(JSON.stringify({ 
        success: true, 
        result: encryptedBase64,
        originalLength: data.length,
        encryptedLength: encryptedBase64.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (operation === 'decrypt') {
      console.log('Starting decryption process');
      
      // Decode base64
      const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      console.log('Decoded data length:', combined.length);
      
      // Extract IV (first 16 bytes) and encrypted data
      const iv = combined.slice(0, 16);
      const encryptedData = combined.slice(16);
      
      console.log('Extracted IV:', Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''));
      console.log('Encrypted data length:', encryptedData.length);
      
      // Import the key for AES-GCM
      const keyBuffer = new TextEncoder().encode(encryptionKey.slice(0, 32)); // Ensure 32 bytes
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        cryptoKey,
        encryptedData
      );
      
      const decryptedText = new TextDecoder().decode(decrypted);
      console.log('Decryption successful, result length:', decryptedText.length);
      
      return new Response(JSON.stringify({ 
        success: true, 
        result: decryptedText,
        encryptedLength: data.length,
        decryptedLength: decryptedText.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid operation. Use "encrypt" or "decrypt"');

  } catch (error) {
    console.error('Error in aes-crypto function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});