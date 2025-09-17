import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, DollarSign, Edit, Trash2, Copy, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = "0x35392F4D2859bA37bE04F32082E5f83caE29C1C1";

const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "minterAddress", "type": "address"}],
    "name": "getPromptsOnSaleByMinterAddress",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "getPromptsOnSale",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_promptId", "type": "bytes32"}],
    "name": "getDescriptionAndPriceOfAPromptOnSale",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}, {"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_promptId", "type": "bytes32"}, {"internalType": "uint256", "name": "_newPrice", "type": "uint256"}],
    "name": "editListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "_promptId", "type": "bytes32"}],
    "name": "purchasePrompt",
    "outputs": [{"internalType": "string", "name": "_prompt", "type": "string"}],
    "stateMutability": "payable",
    "type": "function"
  }
];

interface PromptListing {
  promptId: string;
  description: string;
  price: string;
}

export const PromptListing = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const { toast } = useToast();
  
  const [userListings, setUserListings] = useState<PromptListing[]>([]);
  const [searchResults, setSearchResults] = useState<PromptListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<PromptListing | null>(null);
  const [newPrice, setNewPrice] = useState('');
  
  // Purchase dialog states
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchasedPrompt, setPurchasedPrompt] = useState('');
  
  // Search states
  const [searchType, setSearchType] = useState<'address' | 'tokenId' | 'promptId'>('address');
  const [searchValue, setSearchValue] = useState('');

  const fetchUserListings = async () => {
    if (!account || !isConnected || !isOnTenNetwork) return;
    
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const promptIds = await contract.getPromptsOnSaleByMinterAddress(account);
      
      const listings: PromptListing[] = [];
      for (const promptId of promptIds) {
        try {
          const [description, price] = await contract.getDescriptionAndPriceOfAPromptOnSale(promptId);
          listings.push({
            promptId,
            description,
            price: ethers.formatEther(price)
          });
        } catch (error) {
          console.error('Error fetching listing details:', error);
        }
      }
      
      setUserListings(listings);
    } catch (error: any) {
      console.error('Error fetching user listings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch listings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchValue) return;
    
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      let promptIds: string[] = [];
      
      if (searchType === 'promptId') {
        // Direct prompt ID lookup
        try {
          const [description, price] = await contract.getDescriptionAndPriceOfAPromptOnSale(searchValue);
          if (description) {
            setSearchResults([{
              promptId: searchValue,
              description,
              price: ethers.formatEther(price)
            }]);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          setSearchResults([]);
        }
        setIsLoading(false);
        return;
      }
      
      if (searchType === 'address') {
        promptIds = await contract.getPromptsOnSaleByMinterAddress(searchValue);
      } else if (searchType === 'tokenId') {
        promptIds = await contract.getPromptsOnSale(parseInt(searchValue));
      }
      
      const listings: PromptListing[] = [];
      for (const promptId of promptIds) {
        try {
          const [description, price] = await contract.getDescriptionAndPriceOfAPromptOnSale(promptId);
          listings.push({
            promptId,
            description,
            price: ethers.formatEther(price)
          });
        } catch (error) {
          console.error('Error fetching listing details:', error);
        }
      }
      
      setSearchResults(listings);
    } catch (error: any) {
      console.error('Error searching:', error);
      toast({
        title: "Error",
        description: error.message || "Search failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditListing = async () => {
    if (!selectedListing || !newPrice) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const priceInWei = ethers.parseEther(newPrice);
      const tx = await contract.editListing(selectedListing.promptId, priceInWei);
      await tx.wait();
      
      toast({
        title: "Success",
        description: "Listing updated successfully!",
      });
      
      setShowEditDialog(false);
      setNewPrice('');
      fetchUserListings();
    } catch (error: any) {
      console.error('Error editing listing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to edit listing",
        variant: "destructive",
      });
    }
  };

  const handleDeleteListing = async (promptId: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const tx = await contract.editListing(promptId, 0);
      await tx.wait();
      
      toast({
        title: "Success",
        description: "Listing removed successfully!",
      });
      
      fetchUserListings();
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove listing",
        variant: "destructive",
      });
    }
  };

  const handlePurchasePrompt = async (listing: PromptListing) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      const priceInWei = ethers.parseEther(listing.price);
      const tx = await contract.purchasePrompt(listing.promptId, { value: priceInWei });
      const result = await tx.wait();
      
      // Get the returned prompt from transaction logs or call the contract again
      const prompt = await contract.purchasePrompt.staticCall(listing.promptId, { value: priceInWei });
      
      setPurchasedPrompt(prompt);
      setShowPurchaseDialog(true);
      
      toast({
        title: "Success",
        description: "Prompt purchased successfully!",
      });
    } catch (error: any) {
      console.error('Error purchasing prompt:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase prompt",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(purchasedPrompt);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard",
    });
  };

  useEffect(() => {
    fetchUserListings();
  }, [account, isConnected, isOnTenNetwork]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompt Listing</CardTitle>
          <CardDescription>Manage and explore prompt marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please connect your wallet to access prompt listing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOnTenNetwork) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompt Listing</CardTitle>
          <CardDescription>Manage and explore prompt marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please switch to TEN network to access prompt listing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt Listing</CardTitle>
          <CardDescription>Manage and explore prompt marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="listings" className="w-full">
            <TabsList>
              <TabsTrigger value="listings">Your Listings</TabsTrigger>
              <TabsTrigger value="search">Search Prompts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="listings" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Your Listed Prompts</h3>
                <Button onClick={fetchUserListings} disabled={isLoading} size="sm">
                  Refresh
                </Button>
              </div>
              
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading listings...</p>
                  </div>
                ) : userListings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No listings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userListings.map((listing) => (
                      <Card key={listing.promptId} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Prompt ID</Badge>
                              <code className="text-xs">{listing.promptId.slice(0, 16)}...</code>
                            </div>
                            <p className="text-sm">{listing.description}</p>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <span className="font-medium">{listing.price} ETH</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedListing(listing);
                                setNewPrice(listing.price);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteListing(listing.promptId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="searchType">Search by</Label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value as 'address' | 'tokenId' | 'promptId')}
                    >
                      <option value="address">Minter Address</option>
                      <option value="tokenId">Token ID</option>
                      <option value="promptId">Prompt ID</option>
                    </select>
                  </div>
                  <div className="flex-2 space-y-2">
                    <Label htmlFor="searchValue">
                      {searchType === 'address' ? 'Address' : 
                       searchType === 'tokenId' ? 'Token ID' : 'Prompt ID'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="searchValue"
                        placeholder={`Enter ${searchType}...`}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                      />
                      <Button onClick={handleSearch} disabled={isLoading}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <ScrollArea className="h-[300px]">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No results found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.map((listing) => (
                        <Card key={listing.promptId} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Prompt ID</Badge>
                                <code className="text-xs">{listing.promptId.slice(0, 16)}...</code>
                              </div>
                              <p className="text-sm">{listing.description}</p>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" />
                                <span className="font-medium">{listing.price} ETH</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => handlePurchasePrompt(listing)}
                              className="gap-2"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Buy
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Listing Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Listing Price</DialogTitle>
            <DialogDescription>
              Update the price for your prompt listing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPrice">New Price (ETH)</Label>
              <Input
                id="newPrice"
                type="number"
                step="0.001"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
            <Button onClick={handleEditListing} className="w-full">
              Update Price
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Success Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prompt Purchased Successfully!</DialogTitle>
            <DialogDescription>
              Copy this prompt now - it won't be saved and you may need to buy it again if lost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{purchasedPrompt}</p>
            </div>
            <Button onClick={copyToClipboard} className="w-full gap-2">
              <Copy className="h-4 w-4" />
              Copy Prompt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};