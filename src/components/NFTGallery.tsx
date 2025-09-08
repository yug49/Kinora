import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, MessageCircle } from 'lucide-react';
import { AIChatModal } from './AIChatModal';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = '0x90EE12C568a54C922609C49A46a352ae3e98E20B';
const CONTRACT_ABI = [
  'function getTokenIdsOfAnOnwer(address _owner) public view returns(uint256[] memory)',
  'function getTokenIdToImageUrl(uint256 _tokenId) public view returns(string memory)',
  'function name() public view returns(string memory)',
];

interface NFT {
  id: string;
  name: string;
  image: string;
  initialMemory: string;
  mintedAt: string;
}

export const NFTGallery = () => {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const { account, isConnected } = useWallet();
  const { toast } = useToast();

  const fetchUserNFTs = async () => {
    if (!account || !isConnected) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Get user's token IDs
      const tokenIds = await contract.getTokenIdsOfAnOnwer(account);
      
      if (tokenIds.length === 0) {
        setNfts([]);
        setLoading(false);
        return;
      }

      // Get collection name
      const collectionName = await contract.name();
      
      // Fetch data for each NFT
      const nftPromises = tokenIds.map(async (tokenId: bigint) => {
        const imageUrl = await contract.getTokenIdToImageUrl(tokenId);
        const tokenIdStr = tokenId.toString();
        
        return {
          id: tokenIdStr,
          name: `${collectionName} #${tokenIdStr}`,
          image: imageUrl,
          initialMemory: `I am ${collectionName} #${tokenIdStr}, a unique AI companion with evolving memories.`,
          mintedAt: new Date().toISOString().split('T')[0], // Placeholder for minting date
        };
      });

      const fetchedNFTs = await Promise.all(nftPromises);
      setNfts(fetchedNFTs);
      
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      toast({
        title: "Error Loading NFTs",
        description: "Failed to load your NFT collection. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isConnected && account) {
      fetchUserNFTs();
    }
  }, [isConnected, account]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Your AI NFTs</h2>
        <p className="text-muted-foreground">
          {!isConnected 
            ? "Connect your wallet to view your NFT collection" 
            : "Click on any NFT to chat with your AI companion"
          }
        </p>
      </div>

      {!isConnected ? (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Connect Wallet</h3>
          <p className="text-muted-foreground">Please connect your wallet to view your NFT collection.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-64 w-full" />
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
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
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400&h=400&fit=crop&crop=center';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {nft.initialMemory}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Minted</span>
                    <span>{nft.mintedAt}</span>
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
    </div>
  );
};