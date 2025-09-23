import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Gavel, Plus, Timer, Coins, User, Calendar } from 'lucide-react';

// Mock data for demonstration
const mockNFTsOnSale = [
  {
    tokenId: 1,
    name: "Mystical Dragon #001",
    description: "A powerful dragon with ancient wisdom and magical abilities.",
    image: "/placeholder.svg",
    minBid: 0.5,
    currentHighestBid: 1.2,
    timeLeft: "2d 14h 32m",
    seller: "0x1234...5678",
    bidCount: 7
  },
  {
    tokenId: 2,
    name: "Cyber Samurai #042",
    description: "A futuristic warrior from the digital realm.",
    image: "/placeholder.svg",
    minBid: 1.0,
    currentHighestBid: 2.8,
    timeLeft: "1d 8h 15m",
    seller: "0x8765...4321",
    bidCount: 12
  },
  {
    tokenId: 3,
    name: "Ocean Guardian #003",
    description: "Protector of the deep seas with ancient powers.",
    image: "/placeholder.svg",
    minBid: 0.8,
    currentHighestBid: 1.5,
    timeLeft: "3d 2h 45m",
    seller: "0x2468...1357",
    bidCount: 5
  }
];

const mockUserNFTs = [
  {
    tokenId: 4,
    name: "Fire Phoenix #007",
    description: "A legendary phoenix with the power of rebirth.",
    image: "/placeholder.svg",
    isOnSale: false
  },
  {
    tokenId: 5,
    name: "Ice Wizard #012",
    description: "Master of ice magic and frozen spells.",
    image: "/placeholder.svg",
    isOnSale: true,
    minBid: 1.5,
    timeLeft: "4d 6h 20m"
  }
];

interface NFTCardProps {
  nft: any;
  type: 'market' | 'owned';
  onBid?: () => void;
  onSell?: () => void;
}

const NFTCard = ({ nft, type, onBid, onSell }: NFTCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img 
          src={nft.image} 
          alt={nft.name}
          className="w-full h-full object-cover"
        />
        {type === 'market' && (
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
        {type === 'market' ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Min Bid:</span>
              <span className="font-medium">{nft.minBid} ETH</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Highest Bid:</span>
              <span className="font-semibold text-primary">{nft.currentHighestBid} ETH</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Bids:</span>
              <Badge variant="secondary">{nft.bidCount}</Badge>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Seller:</span>
              <span className="font-mono">{nft.seller}</span>
            </div>
            <Button onClick={onBid} className="w-full">
              <Gavel className="h-4 w-4 mr-2" />
              Place Bid
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {nft.isOnSale ? (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Min Bid:</span>
                  <span className="font-medium">{nft.minBid} ETH</span>
                </div>
                <Badge variant="outline" className="w-full justify-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {nft.timeLeft} left
                </Badge>
                <Button variant="secondary" className="w-full" disabled>
                  On Sale
                </Button>
              </>
            ) : (
              <Button onClick={onSell} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Put on Sale
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const Marketplace = () => {
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [sellForm, setSellForm] = useState({
    tokenId: '',
    minBid: '',
    description: ''
  });
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [showSelectNFTDialog, setShowSelectNFTDialog] = useState(false);

  const handleBid = (nft: any) => {
    setSelectedNFT(nft);
    setShowBidDialog(true);
  };

  const handleSell = (nft: any) => {
    setSellForm({
      tokenId: nft.tokenId.toString(),
      minBid: '',
      description: nft.description
    });
    setShowSellDialog(true);
  };

  const handlePutOnSale = () => {
    setShowSelectNFTDialog(true);
  };

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
              <Badge variant="secondary" className="text-sm">
                {mockNFTsOnSale.length} NFTs available
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockNFTsOnSale.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  nft={nft}
                  type="market"
                  onBid={() => handleBid(nft)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="your-sales" className="mt-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your NFTs</h2>
              <Badge variant="secondary" className="text-sm">
                {mockUserNFTs.filter(nft => nft.isOnSale).length} on sale
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockUserNFTs.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  nft={nft}
                  type="owned"
                  onSell={() => handleSell(nft)}
                />
              ))}
            </div>
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
                <span className="text-sm text-muted-foreground">Current Highest Bid:</span>
                <span className="font-semibold">{selectedNFT?.currentHighestBid} ETH</span>
              </div>
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
              >
                Cancel
              </Button>
              <Button className="flex-1">
                <Coins className="h-4 w-4 mr-2" />
                Place Bid
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {mockUserNFTs.filter(nft => !nft.isOnSale).map((nft) => (
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
              >
                Cancel
              </Button>
              <Button className="flex-1">
                <Gavel className="h-4 w-4 mr-2" />
                Put on Sale
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};