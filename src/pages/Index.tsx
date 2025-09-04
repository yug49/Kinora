import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { MintingForm } from '@/components/MintingForm';
import { NFTGallery } from '@/components/NFTGallery';
import { Sparkles, Images } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-hero border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Confidential Intelligence
            <span className="block text-2xl md:text-3xl text-primary mt-2">
              AI-Powered NFTs
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Mint and interact with intelligent NFTs that have memory, personality, and the ability to learn and evolve.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <Tabs defaultValue="mint" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-12">
            <TabsTrigger value="mint" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Mint NFT
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Images className="h-4 w-4" />
              Your NFTs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="mint" className="space-y-8">
            <div className="max-w-2xl mx-auto">
              <MintingForm />
            </div>
          </TabsContent>
          
          <TabsContent value="gallery" className="space-y-8">
            <NFTGallery />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
