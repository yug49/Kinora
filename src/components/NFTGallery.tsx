import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, MessageCircle } from 'lucide-react';
import { AIChatModal } from './AIChatModal';

// Mock NFT data
const mockNFTs = [
  {
    id: '1',
    name: 'Cosmic Dreamer #001',
    image: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400&h=400&fit=crop&crop=center',
    initialMemory: 'I am a cosmic entity that dreams of distant galaxies and helps users explore the universe.',
    mintedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Digital Sage #002',
    image: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=400&fit=crop&crop=center',
    initialMemory: 'I am an ancient digital sage with knowledge spanning across all realms of technology.',
    mintedAt: '2024-01-14',
  },
  {
    id: '3',
    name: 'Neon Guardian #003',
    image: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=400&h=400&fit=crop&crop=center',
    initialMemory: 'I am a guardian of the neon realm, protecting digital assets and guiding users through cyberspace.',
    mintedAt: '2024-01-13',
  },
];

export const NFTGallery = () => {
  const [selectedNFT, setSelectedNFT] = useState<typeof mockNFTs[0] | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Your AI NFTs</h2>
        <p className="text-muted-foreground">Click on any NFT to chat with your AI companion</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockNFTs.map((nft) => (
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

      {mockNFTs.length === 0 && (
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No NFTs Yet</h3>
          <p className="text-muted-foreground">Mint your first AI NFT to get started!</p>
        </div>
      )}

      <AIChatModal
        nft={selectedNFT}
        isOpen={!!selectedNFT}
        onClose={() => setSelectedNFT(null)}
      />
    </div>
  );
};