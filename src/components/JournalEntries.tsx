import { useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Download } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = '0x0dc28A9b5503981C39e22d06A1ace2A9A30fc1C9';

const CONTRACT_ABI = [
  'function registerEntry(string memory _memory) public returns (bytes32)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function getMemory() public view returns (string memory, tuple(uint32 openness, uint32 conscientiousness, uint32 extraversion, uint32 agreeableness, uint32 neuroticism, uint32 achievement, uint32 compassion, uint32 creativity, uint32 security, uint32 adventure, uint32 knowledge, uint32 autonomy, uint32 community, uint32 skillsHobbiesFrequency, uint32 interestsKnowledgeFrequency, uint32 keyEntitiesFrequency))'
];

export const JournalEntries = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const [newEntry, setNewEntry] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [currentMemory, setCurrentMemory] = useState<{
    cid: string;
    personalityTraits: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
      achievement: number;
      compassion: number;
      creativity: number;
      security: number;
      adventure: number;
      knowledge: number;
      autonomy: number;
      community: number;
      skillsHobbiesFrequency: number;
      interestsKnowledgeFrequency: number;
      keyEntitiesFrequency: number;
    };
  } | null>(null);
  const [isFetching, setIsFetching] = useState(false);

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

  const handleFetchMemory = async () => {
    if (!isConnected || !isOnTenNetwork) return;

    setIsFetching(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      console.log('📖 Fetching current memory from contract...');
      const [cid, personalityTraits] = await contract.getMemory();
      
      console.log('✅ Memory fetched:', { cid, personalityTraits });

      setCurrentMemory({
        cid,
        personalityTraits: {
          openness: Number(personalityTraits.openness),
          conscientiousness: Number(personalityTraits.conscientiousness),
          extraversion: Number(personalityTraits.extraversion),
          agreeableness: Number(personalityTraits.agreeableness),
          neuroticism: Number(personalityTraits.neuroticism),
          achievement: Number(personalityTraits.achievement),
          compassion: Number(personalityTraits.compassion),
          creativity: Number(personalityTraits.creativity),
          security: Number(personalityTraits.security),
          adventure: Number(personalityTraits.adventure),
          knowledge: Number(personalityTraits.knowledge),
          autonomy: Number(personalityTraits.autonomy),
          community: Number(personalityTraits.community),
          skillsHobbiesFrequency: Number(personalityTraits.skillsHobbiesFrequency),
          interestsKnowledgeFrequency: Number(personalityTraits.interestsKnowledgeFrequency),
          keyEntitiesFrequency: Number(personalityTraits.keyEntitiesFrequency),
        }
      });

      toast({
        title: "Memory Retrieved!",
        description: "Successfully fetched your current memory from the blockchain.",
      });

    } catch (error: any) {
      console.error('❌ Failed to fetch memory:', error);
      toast({
        title: "Fetch Failed",
        description: error.message || 'Failed to fetch memory from contract.',
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
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

      {/* Fetch Current Memory Card */}
      <Card className="border-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-secondary" />
            Current Memory on Blockchain
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleFetchMemory}
            disabled={!isConnected || !isOnTenNetwork || isFetching}
            className="w-full"
            variant="secondary"
          >
            <Download className="h-4 w-4" />
            {isFetching ? 'Fetching...' : 'Fetch Current Memory'}
          </Button>

          {currentMemory && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Memory CID</h4>
                <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                  {currentMemory.cid || 'No CID stored'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Personality Traits</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Openness:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.openness}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conscientiousness:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.conscientiousness}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Extraversion:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.extraversion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agreeableness:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.agreeableness}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Neuroticism:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.neuroticism}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Achievement:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.achievement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compassion:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.compassion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Creativity:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.creativity}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Security:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.security}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adventure:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.adventure}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Knowledge:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.knowledge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Autonomy:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.autonomy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Community:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.community}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Skills/Hobbies:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.skillsHobbiesFrequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interests/Knowledge:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.interestsKnowledgeFrequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Key Entities:</span>
                      <span className="font-mono">{currentMemory.personalityTraits.keyEntitiesFrequency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isConnected && (
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to fetch memory
            </p>
          )}

          {isConnected && !isOnTenNetwork && (
            <p className="text-center text-sm text-destructive">
              Switch to TEN Network to fetch memory
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};