import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, MessageCircle, Loader2 } from 'lucide-react';
import { AIChatModal } from './AIChatModal';
import { useWallet } from '@/hooks/useWallet';

const CONTRACT_ADDRESS = '0x90EE12C568a54C922609C49A46a352ae3e98E20B';

const CONTRACT_ABI = [
  'function getTokenIdsOfAnOnwer(address _owner) public view returns(uint256[])',
  'function getTokenIdToImageUrl(uint256 _tokenId) public view returns(string)',
  'function name() public view returns(string)'
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

      // Get token IDs owned by user
      console.log('Calling getTokenIdsOfAnOnwer with address:', account);
      const tokenIdsRaw = await contract.getTokenIdsOfAnOnwer(account);
      console.log('Raw token IDs returned:', tokenIdsRaw);
      console.log('Token IDs type:', typeof tokenIdsRaw);
      console.log('Token IDs constructor:', tokenIdsRaw.constructor.name);
      
      // Convert Proxy/BigInt array to regular array of strings
      const tokenIds = Array.from(tokenIdsRaw).map((id: any) => id);
      console.log('Converted token IDs:', tokenIds);
      console.log('Token IDs length:', tokenIds.length);
      
      if (tokenIds.length === 0) {
        console.log('No token IDs found for user');
        setNfts([]);
        return;
      }

      console.log('Found', tokenIds.length, 'token IDs');

      // Get collection name
      const collectionName = await contract.name();
      console.log('Collection name:', collectionName);

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
    </div>
  );
};