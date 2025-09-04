import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, User, Link } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import { useToast } from '@/components/ui/use-toast';

const CONTRACT_ADDRESS = '0x90EE12C568a54C922609C49A46a352ae3e98E20B';
const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "_imageUrl", "type": "string"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_to", "type": "address"},
      {"internalType": "string", "name": "_imageUrl", "type": "string"}
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export const MintingForm = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const { toast } = useToast();
  const [mintTo, setMintTo] = useState<'self' | 'other'>('self');
  const [customAddress, setCustomAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!isConnected || !isOnTenNetwork || !window.ethereum) {
      toast({
        title: "Connection Error",
        description: "Please connect your wallet and switch to TEN network",
        variant: "destructive"
      });
      return;
    }
    
    setIsMinting(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      let tx;
      
      if (mintTo === 'self') {
        // Call mint(string memory _imageUrl)
        tx = await contract['mint(string)'](imageUrl);
      } else {
        // Call mint(address _to, string memory _imageUrl)
        tx = await contract['mint(address,string)'](customAddress, imageUrl);
      }

      toast({
        title: "Transaction Sent",
        description: `Transaction hash: ${tx.hash}`,
      });

      // Wait for transaction confirmation
      await tx.wait();

      toast({
        title: "NFT Minted Successfully!",
        description: "Your AI NFT has been created on the blockchain",
      });

      // Reset form
      setImageUrl('');
      setCustomAddress('');
      setMintTo('self');
      
    } catch (error: any) {
      console.error('Minting error:', error);
      toast({
        title: "Minting Failed",
        description: error.message || "Failed to mint NFT",
        variant: "destructive"
      });
    } finally {
      setIsMinting(false);
    }
  };

  const isFormValid = imageUrl && (mintTo === 'self' || customAddress);

  // Debug logging
  console.log('Wallet State:', { 
    isConnected, 
    isOnTenNetwork, 
    account, 
    imageUrl: !!imageUrl, 
    mintTo, 
    customAddress: !!customAddress, 
    isFormValid 
  });

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          Mint Your AI NFT
        </CardTitle>
        <CardDescription>
          Create a new Confidential Intelligent NFT on the TEN Network
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