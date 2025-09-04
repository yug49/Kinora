import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, User, Link } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';

export const MintingForm = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const [mintTo, setMintTo] = useState<'self' | 'other'>('self');
  const [customAddress, setCustomAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [initialMemory, setInitialMemory] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!isConnected || !isOnTenNetwork) return;
    
    setIsMinting(true);
    // TODO: Implement actual minting logic
    setTimeout(() => {
      setIsMinting(false);
      // Reset form
      setImageUrl('');
      setInitialMemory('');
      setCustomAddress('');
      setMintTo('self');
    }, 2000);
  };

  const isFormValid = imageUrl && initialMemory && (mintTo === 'self' || customAddress);

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          Mint Your AI NFT
        </CardTitle>
        <CardDescription>
          Create a new Confidential Intelligent NFT with custom memory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mint To Selection */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Mint To</Label>
          <Select value={mintTo} onValueChange={(value: 'self' | 'other') => setMintTo(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Myself
                </div>
              </SelectItem>
              <SelectItem value="other">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Another Address
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Address Input */}
        {mintTo === 'other' && (
          <div className="space-y-2">
            <Label htmlFor="custom-address" className="text-base font-medium">
              Recipient Address
            </Label>
            <Input
              id="custom-address"
              placeholder="0x..."
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className="font-mono"
            />
          </div>
        )}

        {/* Image URL */}
        <div className="space-y-2">
          <Label htmlFor="image-url" className="text-base font-medium">
            Image URL
          </Label>
          <Input
            id="image-url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        {/* Initial Memory */}
        <div className="space-y-2">
          <Label htmlFor="initial-memory" className="text-base font-medium">
            Initial Memory
          </Label>
          <Textarea
            id="initial-memory"
            placeholder="Give your AI NFT its first memory or personality trait..."
            value={initialMemory}
            onChange={(e) => setInitialMemory(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Mint Button */}
        <Button
          onClick={handleMint}
          disabled={!isConnected || !isOnTenNetwork || !isFormValid || isMinting}
          className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 text-lg py-6"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          {isMinting ? 'Minting...' : 'Mint AI NFT'}
        </Button>

        {!isConnected && (
          <p className="text-center text-sm text-muted-foreground">
            Connect your wallet to mint NFTs
          </p>
        )}

        {isConnected && !isOnTenNetwork && (
          <p className="text-center text-sm text-destructive">
            Switch to TEN Network to mint NFTs
          </p>
        )}
      </CardContent>
    </Card>
  );
};