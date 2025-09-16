import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Brain, MessageCircle, Loader2, MoreVertical, Send } from 'lucide-react';
import { AIChatModal } from './AIChatModal';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

const CONTRACT_ADDRESS = '0xED58a7435F9de58dEC8E6B49001107d89D8d0Ac5';

const CONTRACT_ABI = [
  'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
  'function getTokenIdToImageUrl(uint256 _tokenId) public view returns (string memory)',
  'function name() public view returns (string memory)',
  'function mint(string memory _imageUrl) public',
  'function mint(address _to, string memory _imageUrl) public',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function getMinter(uint256 tokenId) public view returns (address)',
  'function registerEntry(string memory _memory) public returns (bytes32)',
  'function submitPrompt(uint256 _tokenId, string memory _prompt) public returns (bytes32)',
  'function transferFrom(address from, address to, uint256 tokenId) public'
];

interface NFT {
  id: string;
  name: string;
  image: string;
}

export const NFTGallery = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTokenId, setTransferTokenId] = useState<string | null>(null);

  const fetchUserNFTs = async () => {
    console.log('=== NFT Fetch Debug ===');
    console.log('Wallet state:', { isConnected, isOnTenNetwork, account });
    
    if (!isConnected || !isOnTenNetwork || !account) {
      console.log('Conditions not met, skipping fetch');
      return;
    }

    console.log('Starting NFT fetch for account:', account);
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      console.log('Contract initialized:', CONTRACT_ADDRESS);

      // Get token balance first
      console.log('Calling balanceOf with address:', account);
      const balance = await contract.balanceOf(account);
      console.log('Balance returned:', balance.toString());
      
      if (balance === 0n) {
        console.log('No tokens found for user');
        setNfts([]);
        return;
      }

      console.log('Found', balance.toString(), 'tokens');

      // Get collection name
      const collectionName = await contract.name();
      console.log('Collection name:', collectionName);

      // Fetch token IDs using tokenOfOwnerByIndex
      const tokenIds = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(account, i);
        tokenIds.push(tokenId);
        console.log('Token ID at index', i, ':', tokenId.toString());
      }

      // Fetch image URLs for each token
      const nftPromises = tokenIds.map(async (tokenId: any) => {
        console.log('Fetching image for token ID:', tokenId.toString());
        const imageUrl = await contract.getTokenIdToImageUrl(tokenId);
        console.log('Image URL for token', tokenId.toString(), ':', imageUrl);
        
        const nft = {
          id: tokenId.toString(),
          name: `CINFT #${tokenId.toString()}`,
          image: imageUrl
        };
        console.log('Created NFT object:', nft);
        return nft;
      });

      const fetchedNFTs = await Promise.all(nftPromises);
      console.log('All NFTs fetched:', fetchedNFTs);
      setNfts(fetchedNFTs);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        account,
        isConnected,
        isOnTenNetwork
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add a small delay to ensure wallet state is fully updated
    const timer = setTimeout(() => {
      fetchUserNFTs();
    }, 100);

    return () => clearTimeout(timer);
  }, [isConnected, isOnTenNetwork, account]);

  const handleTransfer = async () => {
    if (!transferTokenId || !transferAddress || !account) return;

    setTransferring(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      // Validate address format
      if (!ethers.isAddress(transferAddress)) {
        throw new Error('Invalid address format');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      console.log('Initiating transfer:', {
        from: account,
        to: transferAddress,
        tokenId: transferTokenId
      });

      const tx = await contract.transferFrom(account, transferAddress, BigInt(transferTokenId));
      console.log('Transfer transaction sent:', tx.hash);

      toast.success('Transfer initiated! Waiting for confirmation...');
      
      await tx.wait();
      console.log('Transfer confirmed:', tx.hash);
      
      toast.success('NFT transferred successfully!');
      
      // Reset states and refresh NFTs
      setTransferDialogOpen(false);
      setTransferAddress('');
      setTransferTokenId(null);
      fetchUserNFTs();
      
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error(error instanceof Error ? error.message : 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const openTransferDialog = (tokenId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTransferTokenId(tokenId);
    setTransferDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Your AI NFTs</h2>
        <p className="text-muted-foreground">Click on any NFT to chat with your AI companion</p>
      </div>

      {!isConnected ? (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">Connect your wallet to view your NFTs</p>
        </div>
      ) : !isOnTenNetwork ? (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Switch to TEN Network</h3>
          <p className="text-muted-foreground">Switch to TEN Network to view your NFTs</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Loading NFTs...</h3>
          <p className="text-muted-foreground">Fetching your collection from the blockchain</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading NFTs</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchUserNFTs} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
          <Card
            key={nft.id}
            className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-accent bg-gradient-card border-border/50 overflow-hidden"
            onClick={() => setSelectedNFT(nft)}
          >
            <div className="relative">
              <img
                src={nft.image}
                alt={nft.name}
                className="w-full h-64 object-cover transition-all duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Three dots menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-background/80 hover:bg-background/90 h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => openTransferDialog(nft.id, e)}>
                    <Send className="h-4 w-4 mr-2" />
                    Transfer NFT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-primary/90 hover:bg-primary"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </Button>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-foreground text-lg">{nft.name}</h3>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  AI
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Token ID</span>
                <span>#{nft.id}</span>
              </div>
            </CardContent>
          </Card>
            ))}
          </div>

          {nfts.length === 0 && (
            <div className="text-center py-12">
              <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No NFTs Yet</h3>
              <p className="text-muted-foreground">Mint your first AI NFT to get started!</p>
            </div>
          )}
        </>
      )}

      <AIChatModal
        nft={selectedNFT}
        isOpen={!!selectedNFT}
        onClose={() => setSelectedNFT(null)}
      />

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer NFT</DialogTitle>
            <DialogDescription>
              Enter the recipient's wallet address to transfer CINFT #{transferTokenId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Recipient Address</Label>
              <Input
                id="address"
                type="text"
                placeholder="0x..."
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setTransferDialogOpen(false);
                  setTransferAddress('');
                  setTransferTokenId(null);
                }}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={!transferAddress || transferring}
              >
                {transferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Transfer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};