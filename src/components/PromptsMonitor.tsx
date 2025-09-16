import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, User, Clock, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = "0x9A8518cD0B06633437f7966eC5290A2a6E27230E";
const TEN_CHAIN_ID = "0x111"; // 273 in hex

// Minimal ABI for the functions we need
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "getPromptsIds",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_promptId", "type": "bytes32"}],
    "name": "getPromptDetails",
    "outputs": [
      {"internalType": "string", "name": "prompt", "type": "string"},
      {"internalType": "string", "name": "response", "type": "string"},
      {"internalType": "address", "name": "sender", "type": "address"},
      {"internalType": "address", "name": "owner", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

interface PromptDetails {
  prompt: string;
  response: string;
  sender: string;
  owner: string;
  promptId: string;
  responseCid: string;
  actualResponse: string;
}

export const PromptsMonitor = () => {
  const { account, isConnected, chainId, isOnTenNetwork } = useWallet();
  const { toast } = useToast();
  const [promptIds, setPromptIds] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchPromptIds = async () => {
    if (!isConnected || !account || !isOnTenNetwork) {
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const ids = await contract.getPromptsIds();
      setPromptIds(ids.map((id: string) => id));
    } catch (error: any) {
      console.error('Error fetching prompt IDs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch prompt IDs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromptDetails = async (promptId: string) => {
    if (!isConnected || !account) return;

    setIsLoadingDetails(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const [prompt, response, sender, owner] = await contract.getPromptDetails(promptId);
      
      // The response field now contains the IPFS CID
      const responseCid = response;
      let actualResponse = '';
      
      // If we have a CID (and it's not empty), fetch the content from IPFS
      if (responseCid && responseCid !== '' && responseCid.length > 10) {
        try {
          console.log('Fetching response content from IPFS, CID:', responseCid);
          
          const ipfsResponse = await fetch('https://kxombsamuzjwegdhwdve.supabase.co/functions/v1/ipfs-operations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4b21ic2FtdXpqd2VnZGh3ZHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTcwOTMsImV4cCI6MjA3MjU3MzA5M30.cE4_12M5KgaSxx3owZLovsLUycI2ZXR41UKM4-fhAaA`,
            },
            body: JSON.stringify({
              operation: 'fetch',
              cid: responseCid
            })
          });

          if (ipfsResponse.ok) {
            const ipfsResult = await ipfsResponse.json();
            if (ipfsResult.success) {
              actualResponse = ipfsResult.content;
              console.log('Response content fetched from IPFS successfully');
            } else {
              console.warn('Failed to fetch from IPFS:', ipfsResult.error);
              actualResponse = 'Failed to fetch response content from IPFS';
            }
          } else {
            console.warn('IPFS fetch request failed:', ipfsResponse.status);
            actualResponse = 'Failed to fetch response content from IPFS';
          }
        } catch (error) {
          console.error('Error fetching from IPFS:', error);
          actualResponse = 'Error fetching response content from IPFS';
        }
      } else {
        actualResponse = responseCid || 'No response available';
      }
      
      setSelectedPrompt({
        prompt,
        response: responseCid,
        sender,
        owner,
        promptId,
        responseCid,
        actualResponse
      });
    } catch (error: any) {
      console.error('Error fetching prompt details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch prompt details",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchPromptIds();
  }, [isConnected, account, chainId]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompts Monitor</CardTitle>
          <CardDescription>Monitor all prompts and responses for your CINFTs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please connect your wallet to monitor prompts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOnTenNetwork) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompts Monitor</CardTitle>
          <CardDescription>Monitor all prompts and responses for your CINFTs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Please switch to TEN network to monitor prompts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedPrompt) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPrompt(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Button>
          </div>
          <CardTitle>Prompt Details</CardTitle>
          <CardDescription>
            Prompt ID: <code className="text-xs bg-muted px-1 rounded">{selectedPrompt.promptId}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Sender</span>
                  </div>
                  <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                    {selectedPrompt.sender}
                  </code>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">CINFT Owner</span>
                  </div>
                  <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                    {selectedPrompt.owner}
                  </code>
                </div>
              </div>

              <Separator />

              {/* Prompt */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium">Prompt</span>
                  <Badge variant="outline">User</Badge>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border">
                  <p className="text-sm whitespace-pre-wrap">{selectedPrompt.prompt}</p>
                </div>
              </div>

              {/* Response CID */}
              {selectedPrompt.responseCid && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Response CID</span>
                    <Badge variant="outline">IPFS</Badge>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border">
                    <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                      {selectedPrompt.responseCid}
                    </code>
                  </div>
                </div>
              )}

              {/* Actual Response Content */}
              {selectedPrompt.actualResponse && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    <span className="font-medium">AI Response</span>
                    <Badge variant="secondary">CINFT</Badge>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{selectedPrompt.actualResponse}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {!selectedPrompt.responseCid && !selectedPrompt.actualResponse && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No response yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Prompts Monitor</CardTitle>
            <CardDescription>Monitor all prompts and responses for your CINFTs</CardDescription>
          </div>
          <Button onClick={fetchPromptIds} disabled={isLoading} size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading prompts...</p>
          </div>
        ) : promptIds.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No prompts found for your CINFTs</p>
            <p className="text-sm text-muted-foreground mt-2">
              Prompts will appear here when people interact with your CINFTs
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {promptIds.map((promptId, index) => (
                <div
                  key={promptId}
                  className="p-3 rounded-lg border bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                  onClick={() => fetchPromptDetails(promptId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Prompt #{index + 1}</p>
                        <code className="text-xs text-muted-foreground">
                          {promptId.slice(0, 16)}...
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Click to view</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {isLoadingDetails && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading prompt details...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};