import { useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = '0x90EE12C568a54C922609C49A46a352ae3e98E20B';

const CONTRACT_ABI = [
  'function registerEntry(string memory _memory) public'
];

export const JournalEntries = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const [newEntry, setNewEntry] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleAddEntry = async () => {
    if (!newEntry.trim() || !isConnected || !isOnTenNetwork) return;

    setIsRecording(true);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      console.log('=== Journal Recording Debug Info ===');
      console.log('Network Chain ID:', await window.ethereum.request({ method: 'eth_chainId' }));
      console.log('Account:', account);
      console.log('Memory text:', newEntry);
      console.log('Contract Address:', CONTRACT_ADDRESS);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Check network
      const network = await provider.getNetwork();
      console.log('Provider Network:', network.chainId.toString());
      
      if (network.chainId !== BigInt(443)) {
        throw new Error(`Wrong network. Expected TEN Network (443), got ${network.chainId}`);
      }

      // Check contract exists
      const contractCode = await provider.getCode(CONTRACT_ADDRESS);
      console.log('Contract code length:', contractCode.length);
      
      if (contractCode === '0x') {
        throw new Error('Contract not deployed at this address on TEN Network');
      }

      // Check account balance
      const balance = await provider.getBalance(account!);
      const balanceEth = ethers.formatEther(balance);
      console.log('Account balance:', balanceEth, 'ETH');
      
      if (balance === 0n) {
        throw new Error('Insufficient ETH balance for transaction fees');
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Try different approaches for the contract call
      let tx;
      
      try {
        // Method 1: Standard contract call
        console.log('Attempting standard contract call...');
        const gasEstimate = await contract.registerEntry.estimateGas(newEntry);
        console.log('Gas estimate:', gasEstimate.toString());
        
        tx = await contract.registerEntry(newEntry, {
          gasLimit: gasEstimate + (gasEstimate / 10n) // Add 10% buffer
        });
      } catch (estimateError) {
        console.log('Standard call failed, trying alternative method...', estimateError);
        
        // Method 2: Direct transaction with function signature
        const functionSignature = 'registerEntry(string)';
        const functionSelector = ethers.id(functionSignature).slice(0, 10);
        console.log('Function selector:', functionSelector);
        
        const encodedData = contract.interface.encodeFunctionData('registerEntry', [newEntry]);
        console.log('Encoded data:', encodedData);
        
        try {
          const gasEstimate = await provider.estimateGas({
            to: CONTRACT_ADDRESS,
            data: encodedData,
            from: account
          });
          console.log('Direct gas estimate:', gasEstimate.toString());
          
          tx = await signer.sendTransaction({
            to: CONTRACT_ADDRESS,
            data: encodedData,
            gasLimit: gasEstimate + (gasEstimate / 10n)
          });
        } catch (directError) {
          console.log('Direct call also failed:', directError);
          throw new Error(`Contract call failed. The contract may not be properly deployed or the function signature may be incorrect. Original error: ${estimateError.message}`);
        }
      }
      
      console.log('Transaction submitted:', tx.hash);
      
      toast({
        title: "Recording Memory...",
        description: `Transaction submitted: ${tx.hash}`,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      toast({
        title: "Memory Recorded Successfully!",
        description: `Transaction confirmed in block ${receipt.blockNumber}`,
      });

      // Reset form
      setNewEntry('');

    } catch (error: any) {
      console.error('Recording error:', error);
      
      let errorMessage = error.message || 'Failed to record memory. Please try again.';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance for transaction fees.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user.';
      } else if (error.message.includes('Contract not deployed')) {
        errorMessage = 'Smart contract not found on TEN Network. Please verify the contract address.';
      } else if (error.message.includes('Wrong network')) {
        errorMessage = 'Please switch to TEN Network (Chain ID 443).';
      }
      
      toast({
        title: "Recording Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Record Memory Card */}
      <Card className="border-primary/20 shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-primary" />
            Record Memory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Memory Entry
            </label>
            <Textarea
              placeholder="Enter your new memory or experience..."
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.trim() || !isConnected || !isOnTenNetwork || isRecording}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            <Brain className="mr-2 h-4 w-4" />
            {isRecording ? 'Recording...' : 'Record Memory'}
          </Button>
          
          {!isConnected && (
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to record memories
            </p>
          )}

          {isConnected && !isOnTenNetwork && (
            <p className="text-center text-sm text-destructive">
              Switch to TEN Network to record memories
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};