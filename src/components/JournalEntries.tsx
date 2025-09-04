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

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Call registerEntry function
      const tx = await contract.registerEntry(newEntry);
      
      toast({
        title: "Recording Memory...",
        description: `Transaction submitted: ${tx.hash}`,
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      toast({
        title: "Memory Recorded Successfully!",
        description: `Transaction confirmed in block ${receipt.blockNumber}`,
      });

      // Reset form
      setNewEntry('');

    } catch (error: any) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Failed",
        description: error.message || 'Failed to record memory. Please try again.',
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