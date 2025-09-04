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
  },
  {
    "inputs": [{"internalType": "address", "name": "_owner", "type": "address"}],
    "name": "getTokenIdsOfAnOnwer",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
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
    if (!isConnected || !window.ethereum) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your MetaMask wallet first",
        variant: "destructive"
      });
      return;
    }

    // Check network first
    if (!isOnTenNetwork) {
      toast({
        title: "Wrong Network",
        description: "Please switch to TEN Network (Chain ID 443) to mint NFTs",
        variant: "destructive"
      });
      return;
    }
    
    if (!imageUrl || (mintTo === 'other' && !customAddress)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate custom address format if minting to another address
    if (mintTo === 'other') {
      try {
        ethers.getAddress(customAddress);
      } catch (error) {
        toast({
          title: "Invalid Address",
          description: "Please enter a valid Ethereum address",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsMinting(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      console.log('Current network:', network.chainId.toString());
      
      // Double-check we're on TEN network
      if (network.chainId !== BigInt(443)) {
        throw new Error(`Wrong network! Connected to chain ${network.chainId}, but TEN Network requires chain 443`);
      }
      
      const signer = await provider.getSigner();
      
      // Check if contract exists by getting the code
      console.log('Checking contract at address:', CONTRACT_ADDRESS);
      const contractCode = await provider.getCode(CONTRACT_ADDRESS);
      console.log('Contract code length:', contractCode.length);
      
      if (contractCode === '0x' || contractCode.length <= 2) {
        throw new Error(`Contract not deployed at address ${CONTRACT_ADDRESS} on TEN Network (Chain ID 443). Please verify the contract address.`);
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      let tx;
      
      // Check account balance first
      const balance = await provider.getBalance(await signer.getAddress());
      console.log('Account balance:', ethers.formatEther(balance), 'ETH');
      
      if (balance === 0n) {
        throw new Error('Insufficient ETH balance for gas fees. Please add ETH to your wallet on TEN Network.');
      }
      
      if (mintTo === 'self') {
        console.log('Calling mint(string) with imageUrl:', imageUrl);
        // Estimate gas first
        const gasEstimate = await contract.mint.estimateGas(imageUrl);
        console.log('Gas estimate:', gasEstimate.toString());
        
        tx = await contract.mint(imageUrl, {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        });
      } else {
        console.log('Calling mint(address,string) with address:', customAddress, 'imageUrl:', imageUrl);
        // Estimate gas first
        const gasEstimate = await contract.mint.estimateGas(customAddress, imageUrl);
        console.log('Gas estimate:', gasEstimate.toString());
        
        tx = await contract.mint(customAddress, imageUrl, {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        });
      }

      toast({
        title: "Transaction Sent",
        description: `Transaction hash: ${tx.hash}`,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast({
          title: "NFT Minted Successfully!",
          description: "Your AI NFT has been created on the TEN Network",
        });

        // Reset form
        setImageUrl('');
        setCustomAddress('');
        setMintTo('self');
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error: any) {
      console.error('Minting error:', error);
      
      let errorMessage = "Failed to mint NFT";
      
      if (error.code === 'CALL_EXCEPTION') {
        errorMessage = "Contract call failed. The contract may not be properly deployed on TEN Network or the function signature may be incorrect.";
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = "Insufficient ETH for gas fees on TEN Network";
      } else if (error.code === 'USER_REJECTED' || error.code === 4001) {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message.includes('Wrong network')) {
        errorMessage = error.message;
      } else if (error.message.includes('Contract not deployed')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Minting Failed",
        description: errorMessage,
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