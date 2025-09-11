import { useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = '0x7C6Ed37EFc7e1A2f731540fC5E1Dfacc3294b4Fc';

const CONTRACT_ABI = [
  'function registerEntry(string memory _memory) public returns (bytes32)',
  'function getTokenIdsOfAnOwner(address _owner) public view returns (uint256[] memory)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function ownerOf(uint256 tokenId) public view returns (address)'
];

export const JournalEntries = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const [newEntry, setNewEntry] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleAddEntry = async () => {
    if (!isConnected || !isOnTenNetwork || !newEntry.trim()) return;

    setIsRecording(true);
    console.log('🚀 Starting journal memory upload flow...');

    try {
      console.log('📝 Step 1: User entered new memory');
      console.log('Memory content:', newEntry);
      console.log('User account:', account);

      toast({
        title: "Processing memory...",
        description: "Analyzing your memory and updating personality traits...",
      });

      // Call the process-journal-memory edge function
      console.log('🔄 Calling process-journal-memory edge function...');
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('process-journal-memory', {
        body: {
          newMemory: newEntry,
          userAddress: account
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to process memory');
      }

      console.log('✅ Edge function response received:', data);

      if (data.success) {
        console.log('✅ Step 6 Complete: Memory processing completed successfully!');
        console.log('📊 Final agent output:', data.result);
        console.log('📋 Metadata:', data.metadata);
        console.log('🆔 New CID for core memories:', data.newCid);
        
        // Step 7: Register entry with user's wallet
        console.log('📝 Step 7 Started: Registering entry with user wallet...');
        
        if (!window.ethereum) {
          throw new Error('MetaMask not found');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        console.log('📞 Calling registerEntry contract function...');
        const registerTx = await contract.registerEntry(newEntry);
        console.log('📋 Register transaction sent:', registerTx.hash);
        
        console.log('⏳ Waiting for register transaction confirmation...');
        const registerReceipt = await registerTx.wait();
        console.log('✅ Step 7 Complete: Register transaction confirmed in block:', registerReceipt.blockNumber);
        
        // Extract requestId from transaction (it's the keccak256 hash of the memory)
        const requestId = ethers.keccak256(ethers.toUtf8Bytes(newEntry));
        console.log('🆔 Generated Request ID:', requestId);

        // Step 8: Call fulfill-entry edge function
        console.log('🔧 Step 8 Started: Fulfilling entry with traits agent...');
        
        const { data: fulfillData, error: fulfillError } = await supabase.functions.invoke('fulfill-entry', {
          body: {
            requestId: requestId,
            newCid: data.newCid,
            personalityTraits: data.result.personality_traits
          }
        });

        if (fulfillError) {
          console.error('❌ Step 8 Failed: Fulfill entry error:', fulfillError);
          throw new Error(fulfillError.message || 'Failed to fulfill entry');
        }

        console.log('✅ Step 8 Complete: Entry fulfilled successfully!');
        console.log('📋 Fulfill transaction hash:', fulfillData.transactionHash);
        console.log('📦 Fulfill block number:', fulfillData.blockNumber);
        
        toast({
          title: "Memory Processing Complete!",
          description: "Memory analyzed, stored to IPFS, and personality traits updated on blockchain!",
        });

        // Reset form
        setNewEntry('');
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }

    } catch (error: any) {
      console.error('❌ Memory processing failed:', error);
      toast({
        title: "Processing Failed",
        description: error.message || 'Failed to process memory. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Entry Card */}
      <Card className="border-primary/20 shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-primary" />
            Record New Memory
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
              className="min-h-[100px] resize-none"
            />
          </div>
          <Button 
            onClick={handleAddEntry}
            disabled={!isConnected || !isOnTenNetwork || !newEntry.trim() || isRecording}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            <Brain className="h-4 w-4" />
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