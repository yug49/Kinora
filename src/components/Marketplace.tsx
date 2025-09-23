import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Gavel, Plus, Timer, Coins, User, Calendar, ThumbsUp, ThumbsDown, Loader2, RefreshCw } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

// Contract addresses
const CINFT_CONTRACT_ADDRESS = '0x35392F4D2859bA37bE04F32082E5f83caE29C1C1';
const AUCTION_CONTRACT_ADDRESS = '0xA6E851163Af000DFE262eC866364eF2473AA75b3';

// Contract ABIs
const CINFT_ABI = [
  'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
  'function getTokenIdToImageUrl(uint256 _tokenId) public view returns (string memory)',
  'function name() public view returns (string memory)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function getRatingOfAToken(uint256 tokenId) public view returns (uint256 likes, uint256 dislikes)',
  'function approve(address to, uint256 tokenId) public'
];

const AUCTION_ABI = [
  'function getNftsOnSale() public view returns(uint256[] memory)',
  'function isNftOnSale(uint256 _tokenId) public view returns(bool)',
  'function getNftsBidEndTime(uint256 _tokenId) public view returns(uint256)',
  'function getMinBid(uint256 _tokenId) public view returns(uint256)',
  'function getDescription(uint256 _tokenId) public view returns(string memory)',
  'function bid(uint256 _tokenId, uint256 _bid) public payable',
  'function putNftOnSale(uint256 _tokenId, uint256 _minBid, uint256 _bidTimeInSeconds, string memory _description) public',
  'function completeAuction(uint256 _tokenId) public'
];

interface MarketNFT {
  tokenId: string;
  name: string;
  image: string;
  description: string;
  minBid: string;
  timeLeft: string;
  endTime: number;
  likes: number;
  dislikes: number;
}

interface UserNFT {
  tokenId: string;
  name: string;
  image: string;
  description: string;
  likes: number;
  dislikes: number;
  isOnSale?: boolean;
  minBid?: string;
  timeLeft?: string;
  endTime?: number;
}

interface NFTCardProps {
  nft: MarketNFT | UserNFT;
  type: 'market' | 'owned' | 'user-on-sale';
  onBid?: () => void;
  onSell?: () => void;
  onComplete?: () => void;
}

const NFTCard = ({ nft, type, onBid, onSell, onComplete }: NFTCardProps) => {
  const isExpired = type === 'user-on-sale' && 'endTime' in nft && Date.now() / 1000 > nft.endTime!;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img 
          src={nft.image} 
          alt={nft.name}
          className="w-full h-full object-cover"
        />
        {type === 'market' && 'timeLeft' in nft && (
          <Badge className="absolute top-2 left-2 bg-primary/90">
            <Timer className="h-3 w-3 mr-1" />
            {nft.timeLeft}
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{nft.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {nft.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Likes and Dislikes for all types */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <ThumbsUp className="h-3 w-3" />
              <span>{nft.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <ThumbsDown className="h-3 w-3" />
              <span>{nft.dislikes}</span>
            </div>
          </div>
          
          {type === 'market' && 'minBid' in nft ? (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Min Bid:</span>
                <span className="font-medium">{nft.minBid} ETH</span>
              </div>
              <Button onClick={onBid} className="w-full">
                <Gavel className="h-4 w-4 mr-2" />
                Place Bid
              </Button>
            </>
          ) : type === 'user-on-sale' && 'isOnSale' in nft && nft.isOnSale ? (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Min Bid:</span>
                <span className="font-medium">{nft.minBid} ETH</span>
              </div>
              {nft.timeLeft && (
                <Badge variant={isExpired ? "destructive" : "outline"} className="w-full justify-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {isExpired ? "Expired" : `${nft.timeLeft} left`}
                </Badge>
              )}
              {isExpired && onComplete && (
                <Button onClick={onComplete} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Complete Auction
                </Button>
              )}
            </>
          ) : type === 'owned' ? (
            <Button onClick={onSell} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Put on Sale
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export const Marketplace = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  
  // State
  const [marketNFTs, setMarketNFTs] = useState<MarketNFT[]>([]);
  const [userNFTsOnSale, setUserNFTsOnSale] = useState<UserNFT[]>([]);
  const [availableNFTs, setAvailableNFTs] = useState<UserNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserSales, setLoadingUserSales] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedNFT, setSelectedNFT] = useState<MarketNFT | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [sellForm, setSellForm] = useState({
    tokenId: '',
    minBid: '',
    bidTimeInDays: '7',
    bidTimeInMinutes: '0',
    description: ''
  });
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [showSelectNFTDialog, setShowSelectNFTDialog] = useState(false);
  const [bidding, setBidding] = useState(false);
  const [selling, setSelling] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Helper functions
  const formatTimeLeft = (endTime: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) return "Expired";
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Fetch live auction NFTs
  const fetchMarketNFTs = async () => {
    if (!isConnected || !isOnTenNetwork) return;

    setLoading(true);
    setError(null);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, provider);
      const cinftContract = new ethers.Contract(CINFT_CONTRACT_ADDRESS, CINFT_ABI, provider);

      // Get all NFTs on sale
      const tokenIds = await auctionContract.getNftsOnSale();
      
      const nftsData = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          try {
            const [imageUrl, description, minBid, endTime, ratings] = await Promise.all([
              cinftContract.getTokenIdToImageUrl(tokenId),
              auctionContract.getDescription(tokenId),
              auctionContract.getMinBid(tokenId),
              auctionContract.getNftsBidEndTime(tokenId),
              cinftContract.getRatingOfAToken(tokenId)
            ]);

            return {
              tokenId: tokenId.toString(),
              name: `CINFT #${tokenId.toString()}`,
              image: imageUrl,
              description,
              minBid: ethers.formatEther(minBid),
              timeLeft: formatTimeLeft(Number(endTime)),
              endTime: Number(endTime),
              likes: Number(ratings[0]),
              dislikes: Number(ratings[1])
            };
          } catch (err) {
            console.error(`Error fetching data for token ${tokenId}:`, err);
            return null;
          }
        })
      );

      setMarketNFTs(nftsData.filter(nft => nft !== null) as MarketNFT[]);
    } catch (err) {
      console.error('Error fetching market NFTs:', err);
      setError('Failed to fetch market NFTs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's NFTs on sale
  const fetchUserNFTsOnSale = async () => {
    if (!isConnected || !isOnTenNetwork || !account) return;

    setLoadingUserSales(true);
    
    try {
      // NOTE: The deployed contract doesn't have getListOfNftsBySeller function
      // This is a limitation of the current contract deployment
      // For now, we'll set empty array and show a message to the user
      console.log('getListOfNftsBySeller function not available in deployed contract');
      setUserNFTsOnSale([]);
    } catch (err) {
      console.error('Error fetching user NFTs on sale:', err);
    } finally {
      setLoadingUserSales(false);
    }
  };

  // Fetch user's available NFTs (show all NFTs, let contract handle sale status)
  const fetchAvailableNFTs = async () => {
    console.log('=== Fetching User NFTs Debug ===');
    console.log('Wallet state:', { isConnected, isOnTenNetwork, account });
    
    if (!isConnected || !isOnTenNetwork || !account) {
      console.log('Conditions not met, skipping fetch');
      return;
    }

    console.log('Starting NFTs fetch for account:', account);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const cinftContract = new ethers.Contract(CINFT_CONTRACT_ADDRESS, CINFT_ABI, provider);

      console.log('Contract initialized');
      console.log('CINFT Contract:', CINFT_CONTRACT_ADDRESS);

      // Get user's balance and token IDs
      console.log('Calling balanceOf with address:', account);
      const balance = await cinftContract.balanceOf(account);
      console.log('Balance returned:', balance.toString());
      
      if (balance === 0n) {
        console.log('No tokens found for user');
        setAvailableNFTs([]);
        return;
      }

      console.log('Found', balance.toString(), 'tokens, fetching token IDs...');
      const tokenIds = [];
      
      for (let i = 0; i < balance; i++) {
        const tokenId = await cinftContract.tokenOfOwnerByIndex(account, i);
        tokenIds.push(tokenId);
        console.log('Token ID at index', i, ':', tokenId.toString());
      }

      console.log('All token IDs:', tokenIds.map(t => t.toString()));

      // Fetch details for all tokens (don't filter by sale status)
      console.log('Fetching details for all tokens...');
      const nftsData = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          try {
            console.log('Fetching details for token', tokenId.toString());
            const [imageUrl, ratings] = await Promise.all([
              cinftContract.getTokenIdToImageUrl(tokenId),
              cinftContract.getRatingOfAToken(tokenId)
            ]);

            console.log('Token', tokenId.toString(), 'details:', {
              imageUrl,
              likes: Number(ratings[0]),
              dislikes: Number(ratings[1])
            });

            return {
              tokenId: tokenId.toString(),
              name: `CINFT #${tokenId.toString()}`,
              image: imageUrl,
              description: `AI-generated NFT with unique personality and capabilities.`,
              likes: Number(ratings[0]),
              dislikes: Number(ratings[1]),
              isOnSale: false
            };
          } catch (err) {
            console.error(`Error fetching data for token ${tokenId}:`, err);
            return null;
          }
        })
      );

      const filteredNFTs = nftsData.filter(nft => nft !== null) as UserNFT[];
      console.log('Final user NFTs:', filteredNFTs);
      setAvailableNFTs(filteredNFTs);
    } catch (err) {
      console.error('Error fetching user NFTs:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        account,
        isConnected,
        isOnTenNetwork
      });
      toast.error('Failed to fetch your NFTs');
    }
  };

  // Event handlers
  const handleBid = (nft: MarketNFT) => {
    setSelectedNFT(nft);
    setBidAmount('');
    setShowBidDialog(true);
  };

  const handleSell = (nft: UserNFT) => {
    setSellForm({
      tokenId: nft.tokenId,
      minBid: '',
      bidTimeInDays: '7',
      bidTimeInMinutes: '0',
      description: nft.description
    });
    setShowSellDialog(true);
  };

  const handlePutOnSale = async () => {
    await fetchAvailableNFTs();
    setShowSelectNFTDialog(true);
  };

  const submitBid = async () => {
    if (!selectedNFT || !bidAmount || !account) return;

    setBidding(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);

      const bidInWei = ethers.parseEther(bidAmount);
      
      const tx = await auctionContract.bid(BigInt(selectedNFT.tokenId), bidInWei, {
        value: bidInWei
      });

      toast.success('Bid placed! Waiting for confirmation...');
      await tx.wait();
      toast.success('Bid confirmed successfully!');
      
      setShowBidDialog(false);
      setBidAmount('');
      fetchMarketNFTs();
      
    } catch (err) {
      console.error('Bid failed:', err);
      toast.error(err instanceof Error ? err.message : 'Bid failed');
    } finally {
      setBidding(false);
    }
  };

  const submitSale = async () => {
    if (!sellForm.tokenId || !sellForm.minBid || !sellForm.description) return;

    setSelling(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);
      const cinftContract = new ethers.Contract(CINFT_CONTRACT_ADDRESS, CINFT_ABI, signer);

      // First approve the auction contract to transfer the NFT
      const approveTx = await cinftContract.approve(AUCTION_CONTRACT_ADDRESS, BigInt(sellForm.tokenId));
      toast.success('Approval sent! Waiting for confirmation...');
      await approveTx.wait();

      // Then put the NFT on sale
      const minBidInWei = ethers.parseEther(sellForm.minBid);
      const bidTimeInSeconds = (parseInt(sellForm.bidTimeInDays) * 24 * 60 * 60) + (parseInt(sellForm.bidTimeInMinutes) * 60);
      
      const tx = await auctionContract.putNftOnSale(
        BigInt(sellForm.tokenId),
        minBidInWei,
        bidTimeInSeconds,
        sellForm.description
      );

      toast.success('NFT listing created! Waiting for confirmation...');
      await tx.wait();
      toast.success('NFT listed successfully!');
      
      setShowSellDialog(false);
      setSellForm({ tokenId: '', minBid: '', bidTimeInDays: '7', bidTimeInMinutes: '0', description: '' });
      fetchMarketNFTs();
      fetchUserNFTsOnSale();
      
    } catch (err) {
      console.error('Sale failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to list NFT');
    } finally {
      setSelling(false);
    }
  };

  const completeAuction = async (tokenId: string) => {
    if (!account) return;

    setCompleting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);

      const tx = await auctionContract.completeAuction(BigInt(tokenId));
      toast.success('Auction completion initiated! Waiting for confirmation...');
      await tx.wait();
      toast.success('Auction completed successfully!');
      
      fetchMarketNFTs();
      fetchUserNFTsOnSale();
      
    } catch (err) {
      console.error('Complete auction failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to complete auction');
    } finally {
      setCompleting(false);
    }
  };

  // Effects
  useEffect(() => {
    if (isConnected && isOnTenNetwork) {
      fetchMarketNFTs();
      fetchUserNFTsOnSale();
    }
  }, [isConnected, isOnTenNetwork, account]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">NFT Marketplace</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover and bid on unique CINFTs using Vickrey's second-price auction method for fair and transparent trading.
        </p>
      </div>

      {/* Put NFT on Sale Button */}
      <div className="flex justify-center">
        <Button onClick={handlePutOnSale} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Put CINFT on Sale
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="live-market" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="live-market">Live Market</TabsTrigger>
          <TabsTrigger value="your-sales">Your NFTs on Sale</TabsTrigger>
        </TabsList>

        <TabsContent value="live-market" className="mt-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Live Auctions</h2>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm">
                  {marketNFTs.length} NFTs available
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchMarketNFTs}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {!isConnected ? (
              <div className="text-center py-12">
                <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
                <p className="text-muted-foreground">Connect your wallet to view live auctions</p>
              </div>
            ) : !isOnTenNetwork ? (
              <div className="text-center py-12">
                <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Switch to TEN Network</h3>
                <p className="text-muted-foreground">Switch to TEN Network to view auctions</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Loading Auctions...</h3>
                <p className="text-muted-foreground">Fetching live auction data from blockchain</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading Auctions</h3>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={fetchMarketNFTs} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : marketNFTs.length === 0 ? (
              <div className="text-center py-12">
                <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Live Auctions</h3>
                <p className="text-muted-foreground">No CINFTs are currently on auction</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marketNFTs.map((nft) => (
                  <NFTCard
                    key={nft.tokenId}
                    nft={nft}
                    type="market"
                    onBid={() => handleBid(nft)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="your-sales" className="mt-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your NFTs on Sale</h2>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm">
                  {userNFTsOnSale.length} on sale
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUserNFTsOnSale}
                  disabled={loadingUserSales}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUserSales ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
            
            {!isConnected ? (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
                <p className="text-muted-foreground">Connect your wallet to view your NFTs on sale</p>
              </div>
            ) : !isOnTenNetwork ? (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Switch to TEN Network</h3>
                <p className="text-muted-foreground">Switch to TEN Network to manage your sales</p>
              </div>
            ) : loadingUserSales ? (
              <div className="text-center py-12">
                <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Loading Your Sales...</h3>
                <p className="text-muted-foreground">Fetching your NFTs on sale</p>
              </div>
            ) : userNFTsOnSale.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Cannot Load User Sales</h3>
                <p className="text-muted-foreground mb-2">
                  The deployed contract is missing the `getListOfNftsBySeller` function.
                </p>
                <p className="text-muted-foreground text-sm">
                  Contact the contract developer to add this function or use the live market to view all auctions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userNFTsOnSale.map((nft) => (
                  <NFTCard
                    key={nft.tokenId}
                    nft={nft}
                    type="user-on-sale"
                    onComplete={() => completeAuction(nft.tokenId)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Bid Dialog */}
      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Bid</DialogTitle>
            <DialogDescription>
              Enter your bid amount for {selectedNFT?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minimum Bid:</span>
                <span className="font-medium">{selectedNFT?.minBid} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Time Left:</span>
                <Badge variant="outline">{selectedNFT?.timeLeft}</Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bidAmount">Your Bid Amount (ETH)</Label>
              <Input
                id="bidAmount"
                type="number"
                step="0.01"
                placeholder={`Minimum ${selectedNFT?.minBid} ETH`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowBidDialog(false)}
                disabled={bidding}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={submitBid}
                disabled={bidding || !bidAmount || parseFloat(bidAmount) < parseFloat(selectedNFT?.minBid || '0')}
              >
                {bidding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4 mr-2" />
                )}
                {bidding ? 'Placing Bid...' : 'Place Bid'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Select NFT to Sell Dialog */}
      <Dialog open={showSelectNFTDialog} onOpenChange={setShowSelectNFTDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select NFT to Put on Sale</DialogTitle>
            <DialogDescription>
              Choose which CINFT you want to put on the marketplace
            </DialogDescription>
          </DialogHeader>
          
          {availableNFTs.length === 0 ? (
            <div className="text-center py-8">
              <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No CINFTs found</h3>
              <p className="text-muted-foreground text-sm">
                You don't own any CINFTs yet. Mint some CINFTs first to put them on sale.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {availableNFTs.map((nft) => (
                <Card 
                  key={nft.tokenId}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    handleSell(nft);
                    setShowSelectNFTDialog(false);
                  }}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <img 
                      src={nft.image} 
                      alt={nft.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{nft.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {nft.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sell NFT Dialog */}
      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put NFT on Sale</DialogTitle>
            <DialogDescription>
              Set up your auction parameters
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tokenId">Token ID</Label>
              <Input
                id="tokenId"
                value={sellForm.tokenId}
                onChange={(e) => setSellForm({...sellForm, tokenId: e.target.value})}
                placeholder="Token ID"
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minBid">Minimum Bid (ETH)</Label>
              <Input
                id="minBid"
                type="number"
                step="0.01"
                value={sellForm.minBid}
                onChange={(e) => setSellForm({...sellForm, minBid: e.target.value})}
                placeholder="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label>Auction Duration</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bidTimeDays" className="text-sm text-muted-foreground">Days</Label>
                  <Input
                    id="bidTimeDays"
                    type="number"
                    min="0"
                    max="30"
                    value={sellForm.bidTimeInDays}
                    onChange={(e) => setSellForm({...sellForm, bidTimeInDays: e.target.value})}
                    placeholder="7"
                  />
                </div>
                <div>
                  <Label htmlFor="bidTimeMinutes" className="text-sm text-muted-foreground">Minutes</Label>
                  <Input
                    id="bidTimeMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={sellForm.bidTimeInMinutes}
                    onChange={(e) => setSellForm({...sellForm, bidTimeInMinutes: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={sellForm.description}
                onChange={(e) => setSellForm({...sellForm, description: e.target.value})}
                placeholder="Describe your NFT for potential buyers..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowSellDialog(false)}
                disabled={selling}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={submitSale}
                disabled={selling || !sellForm.minBid || !sellForm.description || (!sellForm.bidTimeInDays && !sellForm.bidTimeInMinutes)}
              >
                {selling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Gavel className="h-4 w-4 mr-2" />
                )}
                {selling ? 'Listing...' : 'Put on Sale'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};