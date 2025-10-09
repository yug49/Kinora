import { useState } from 'react';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Brain, Bot, User, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';

interface NFT {
  id: string;
  name: string;
  image: string;
}

interface AIChatModalProps {
  nft: NFT | null;
  isOpen: boolean;
  onClose: () => void;
}

const CONTRACT_ADDRESS = '0x0dc28A9b5503981C39e22d06A1ace2A9A30fc1C9';
const CONTRACT_ABI = [
  'function submitPrompt(uint256 _tokenId, string memory _prompt) public returns (bytes32 promptId)',
];

export const AIChatModal = ({ nft, isOpen, onClose }: AIChatModalProps) => {
  const { account } = useWallet();
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetChat = () => {
    console.log('=== Resetting Chat State ===');
    setCurrentPrompt('');
    setCurrentResponse('');
    setProcessingStep('');
    setError(null);
  };

  const handleSendMessage = async () => {
    if (!currentPrompt.trim() || !nft || !account) {
      console.log('Cannot send message - missing data:', { prompt: !!currentPrompt.trim(), nft: !!nft, account: !!account });
      return;
    }

    console.log('=== Starting CINFT Chat Process ===');
    console.log('NFT ID:', nft.id);
    console.log('Prompt:', currentPrompt);
    console.log('User account:', account);

    setIsProcessing(true);
    setError(null);
    setCurrentResponse('');
    setProcessingStep('Submitting prompt to blockchain...');

    try {
      // Step 1: Submit prompt to smart contract
      console.log('=== Step 1: Submitting prompt to smart contract ===');
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      console.log('Contract instance created');
      console.log('Calling submitPrompt with tokenId:', nft.id, 'and prompt length:', currentPrompt.length);

      const tx = await contract.submitPrompt(nft.id, currentPrompt);
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);

      // Extract promptId from transaction logs
      // Always calculate the promptId deterministically from the prompt
      const promptId = ethers.keccak256(ethers.toUtf8Bytes(currentPrompt));
      console.log('Prompt ID (calculated):', promptId);
      
      if (receipt.logs && receipt.logs.length > 0) {
        console.log('Transaction logs found:', receipt.logs.length);
        // In a production implementation, you could decode the actual event logs here
        // to get the promptId from the ResponseRequested event
      }

      // Step 2-6: Call server-side function with proper verification
      console.log('=== Starting Server-Side Processing ===');
      setProcessingStep('Generating AI response and storing to IPFS...');
      
      const serverResponse = await supabase.functions.invoke('cinft-chat', {
        body: {
          tokenId: nft.id,
          prompt: currentPrompt,
          promptId: promptId,
          userWalletAddress: account
        }
      });

      console.log('Server function response:', serverResponse);

      if (serverResponse.error) {
        throw new Error(`Server error: ${serverResponse.error.message}`);
      }

      if (!serverResponse.data || !serverResponse.data.success) {
        throw new Error(`Server processing failed: ${serverResponse.data?.error || 'Unknown error'}`);
      }

      // Verify that the response was properly stored and confirmed
      const responseData = serverResponse.data;
      
      // Check verification status - allow partial verification
      if (responseData.verified) {
        const { ipfsStorage, contractStorage } = responseData.verified;
        
        if (!ipfsStorage) {
          console.warn('IPFS storage verification failed');
        }
        
        if (!contractStorage) {
          console.warn('Contract storage verification failed - response stored in IPFS only');
        }
        
        if (!ipfsStorage && !contractStorage) {
          throw new Error('Response verification failed: Neither IPFS nor contract storage confirmed');
        }
      }

      console.log('=== CINFT Chat Process Completed Successfully ===');
      console.log('AI Response length:', responseData.response.length);
      console.log('Transaction Hash:', responseData.txHash || 'N/A');
      console.log('Block Number:', responseData.blockNumber || 'N/A');
      console.log('IPFS CID:', responseData.responseCid);
      console.log('Storage Verification:', responseData.verified);
      
      setProcessingStep('Response generated and stored!');
      setCurrentResponse(responseData.response);

    } catch (error) {
      console.error('=== CINFT Chat Process Failed ===');
      console.error('Error details:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      // If it's a user rejection, don't show as error
      if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
        setError('Transaction was cancelled by user');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    console.log('=== Closing CINFT Chat Modal ===');
    resetChat();
    onClose();
  };

  if (!nft) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col bg-gradient-card border-border/50">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <img
              src={nft.image}
              alt={nft.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex flex-col items-start">
              <span className="text-lg">{nft.name}</span>
              <Badge variant="secondary" className="flex items-center gap-1 mt-1">
                <Brain className="h-3 w-3" />
                CINFT AI Persona
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Chat with your personalized AI companion powered by blockchain memory
          </DialogDescription>
        </DialogHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 px-4 py-4 min-h-0">
          <div className="space-y-4">
            {/* Current Prompt Display */}
            {currentPrompt && (
              <div className="flex gap-3 flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 max-w-[80%] text-right">
                  <div className="bg-primary text-primary-foreground rounded-lg p-3 ml-auto">
                    <p className="text-sm">{currentPrompt}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="h-4 w-4 text-accent animate-spin" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {processingStep || 'Processing with AI persona...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-destructive" />
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            {/* AI Response Display */}
            {currentResponse && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 max-w-[80%]">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{currentResponse}</ReactMarkdown>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {!currentPrompt && !currentResponse && !isProcessing && !error && (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">AI Persona Ready</h3>
                <p className="text-muted-foreground text-sm">
                  Send a message to interact with your personalized AI companion.
                  Each conversation starts fresh with access to the persona's unique memories and traits.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2 p-4 border-t border-border/50">
          <Input
            placeholder="Ask your AI persona anything..."
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isProcessing}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!currentPrompt.trim() || isProcessing || !account}
            className="px-4"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!account && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              Connect your wallet to chat with your AI persona
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};