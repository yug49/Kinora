import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AESCrypto = () => {
  const [plainText, setPlainText] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [encryptedResult, setEncryptedResult] = useState('');
  const [decryptedResult, setDecryptedResult] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const { toast } = useToast();

  const handleEncrypt = async () => {
    if (!plainText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to encrypt",
        variant: "destructive"
      });
      return;
    }

    setIsEncrypting(true);
    console.log('🔐 Starting encryption process');
    console.log('📝 Input text length:', plainText.length);
    console.log('📝 Input text preview:', plainText.substring(0, 50) + (plainText.length > 50 ? '...' : ''));

    try {
      const { data, error } = await supabase.functions.invoke('aes-crypto', {
        body: {
          operation: 'encrypt',
          data: plainText
        }
      });

      if (error) {
        console.error('❌ Encryption error:', error);
        throw error;
      }

      if (data.success) {
        console.log('✅ Encryption successful');
        console.log('📊 Original length:', data.originalLength);
        console.log('📊 Encrypted length:', data.encryptedLength);
        console.log('🔒 Encrypted result preview:', data.result.substring(0, 100) + '...');
        
        setEncryptedResult(data.result);
        toast({
          title: "Success",
          description: `Text encrypted successfully! (${data.originalLength} → ${data.encryptedLength} chars)`
        });
      } else {
        throw new Error(data.error || 'Encryption failed');
      }
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      toast({
        title: "Encryption Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedText.trim()) {
      toast({
        title: "Error", 
        description: "Please enter encrypted text to decrypt",
        variant: "destructive"
      });
      return;
    }

    setIsDecrypting(true);
    console.log('🔓 Starting decryption process');
    console.log('📝 Encrypted text length:', encryptedText.length);
    console.log('📝 Encrypted text preview:', encryptedText.substring(0, 100) + (encryptedText.length > 100 ? '...' : ''));

    try {
      const { data, error } = await supabase.functions.invoke('aes-crypto', {
        body: {
          operation: 'decrypt',
          data: encryptedText
        }
      });

      if (error) {
        console.error('❌ Decryption error:', error);
        throw error;
      }

      if (data.success) {
        console.log('✅ Decryption successful');
        console.log('📊 Encrypted length:', data.encryptedLength);
        console.log('📊 Decrypted length:', data.decryptedLength);
        console.log('🔓 Decrypted result preview:', data.result.substring(0, 50) + (data.result.length > 50 ? '...' : ''));
        
        setDecryptedResult(data.result);
        toast({
          title: "Success",
          description: `Text decrypted successfully! (${data.encryptedLength} → ${data.decryptedLength} chars)`
        });
      } else {
        throw new Error(data.error || 'Decryption failed');
      }
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      toast({
        title: "Decryption Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    console.log(`📋 Copied ${type} to clipboard`);
    toast({
      title: "Copied",
      description: `${type} copied to clipboard`
    });
  };

  return (
    <div className="space-y-6">
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <strong>Development Only:</strong> This encryption/decryption feature is for testing purposes only and will be seriously removed for security purposes in production.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Encryption Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Encrypt Data
            </CardTitle>
            <CardDescription>
              Enter text to encrypt using AES-256-GCM encryption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plaintext">Plain Text</Label>
              <Textarea
                id="plaintext"
                placeholder="Enter text to encrypt..."
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                rows={4}
              />
            </div>
            
            <Button 
              onClick={handleEncrypt} 
              disabled={isEncrypting || !plainText.trim()}
              className="w-full"
            >
              {isEncrypting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Encrypting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Encrypt
                </div>
              )}
            </Button>

            {encryptedResult && (
              <div className="space-y-2">
                <Label>Encrypted Result</Label>
                <div className="relative">
                  <Textarea
                    value={encryptedResult}
                    readOnly
                    rows={4}
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => copyToClipboard(encryptedResult, 'Encrypted text')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decryption Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-secondary" />
              Decrypt Data
            </CardTitle>
            <CardDescription>
              Enter encrypted text to decrypt using AES-256-GCM decryption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="encryptedtext">Encrypted Text</Label>
              <Textarea
                id="encryptedtext"
                placeholder="Enter encrypted text to decrypt..."
                value={encryptedText}
                onChange={(e) => setEncryptedText(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            
            <Button 
              onClick={handleDecrypt} 
              disabled={isDecrypting || !encryptedText.trim()}
              className="w-full"
              variant="secondary"
            >
              {isDecrypting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Decrypting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Unlock className="h-4 w-4" />
                  Decrypt
                </div>
              )}
            </Button>

            {decryptedResult && (
              <div className="space-y-2">
                <Label>Decrypted Result</Label>
                <div className="relative">
                  <Textarea
                    value={decryptedResult}
                    readOnly
                    rows={4}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => copyToClipboard(decryptedResult, 'Decrypted text')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
          <CardDescription>
            Try encrypting this sample text to see how AES encryption works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Sample Text</Label>
            <div className="flex gap-2">
              <Textarea
                value="Hello, this is a secret message that will be encrypted using AES-256-GCM!"
                readOnly
                rows={2}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setPlainText("Hello, this is a secret message that will be encrypted using AES-256-GCM!");
                  console.log('📝 Sample text loaded for encryption');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};