import { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, User, Link } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = '0xED58a7435F9de58dEC8E6B49001107d89D8d0Ac5';

const CONTRACT_ABI = [
  'function mint(string memory _imageUrl) public',
  'function mint(address _to, string memory _imageUrl) public',
  'function name() public view returns (string memory)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function balanceOf(address owner) public view returns (uint256)',
];

export const MintingForm = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const [mintTo, setMintTo] = useState<'self' | 'other'>('self');
  const [customAddress, setCustomAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!isConnected || !isOnTenNetwork || !imageUrl) return;

    setIsMinting(true);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      let tx;
      
      if (mintTo === 'self') {
        // Call mint(string memory _imageUrl)
        tx = await contract.mint(imageUrl);
        toast({
          title: "Minting to yourself...",
          description: `Transaction submitted: ${tx.hash}`,
        });
      } else {
        // Validate address
        if (!ethers.isAddress(customAddress)) {
          throw new Error('Invalid recipient address');
        }
        
        // Call mint(address _to, string memory _imageUrl)
        tx = await contract.mint(customAddress, imageUrl);
        toast({
          title: "Minting to recipient...",
          description: `Transaction submitted: ${tx.hash}`,
        });
      }

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      toast({
        title: "NFT Minted Successfully!",
        description: `Transaction confirmed in block ${receipt.blockNumber}`,
      });

      // Reset form
      setImageUrl('');
      setCustomAddress('');
      setMintTo('self');

    } catch (error: any) {
      console.error('Minting error:', error);
      console.error('Error structure:', JSON.stringify(error, null, 2));
      
      // Check for account registration error specific to TEN network (multiple possible paths)
      const errorMessage = error.message || '';
      const dataMessage = error.info?.error?.data?.message || '';
      const cause = error.info?.error?.data?.cause || '';
      
      if (errorMessage.includes('not registered to current user') || 
          dataMessage.includes('not registered to current user') ||
          cause.includes('not registered to current user')) {
        toast({
          title: "Account Not Registered with TEN Network",
          description: "Your wallet address needs to be registered with TEN Network first. Please visit the TEN Network documentation to register your account before minting.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Minting Failed",
          description: error.message || 'Failed to mint NFT. Please try again.',
          variant: "destructive",
        });
      }
    } finally {
      setIsMinting(false);
    }
  };

  const isFormValid = imageUrl && (mintTo === 'self' || customAddress);

  return (
    <Card className="bg-gradient-card border-border/50 shadow-card">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Sparkles className="h-6 w-6 text-primary" />
          Mint Your AI NFT
        </CardTitle>
        <CardDescription>
          Create a new Confidential Intelligent NFT
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