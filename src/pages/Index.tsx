import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import kinoraCover from '@/assets/kinora-cover.png';
import { Header } from '@/components/Header';
import { MintingForm } from '@/components/MintingForm';
import { NFTGallery } from '@/components/NFTGallery';
import { JournalEntries } from '@/components/JournalEntries';
import { PromptsMonitor } from '@/components/PromptsMonitor';
import { PromptListing } from '@/components/PromptListing';
import { Marketplace } from '@/components/Marketplace';
import { Sparkles, Images, BookOpen, Monitor, ShoppingBag, Store, Archive } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-hero border-b border-border/50">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${kinoraCover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-6 py-16 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Kinora
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
          <TabsList className="grid w-full grid-cols-7 max-w-6xl mx-auto mb-6">
              <TabsTrigger value="mint" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Mint NFT
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-2">
                <Images className="h-4 w-4" />
                Your NFTs
              </TabsTrigger>
              <TabsTrigger value="journal" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Journal
              </TabsTrigger>
              <TabsTrigger value="monitor" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Monitor
              </TabsTrigger>
              <TabsTrigger value="listing" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Prompt Listing
              </TabsTrigger>
              <TabsTrigger value="marketplace" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Marketplace
              </TabsTrigger>
              <TabsTrigger value="legacy" className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Legacy
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
          
          <TabsContent value="journal" className="space-y-8">
            <div className="max-w-4xl mx-auto">
              <JournalEntries />
            </div>
          </TabsContent>
          
          <TabsContent value="monitor" className="space-y-8">
            <div className="max-w-6xl mx-auto">
              <PromptsMonitor />
            </div>
          </TabsContent>
          
          <TabsContent value="listing" className="space-y-8">
            <div className="max-w-6xl mx-auto">
              <PromptListing />
            </div>
          </TabsContent>
          
          <TabsContent value="marketplace" className="space-y-8">
            <div className="max-w-6xl mx-auto">
              <Marketplace />
            </div>
          </TabsContent>
          
          <TabsContent value="legacy" className="space-y-8">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-6 w-6 text-primary" />
                    Legacy System
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-primary">Coming Soon in Session 6</h3>
                    <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                      A system where users can pre-set nominees and must ping the servers once a year. If they don't ping, their nominees will receive their CINFTs and any money left by the user, as they are considered deceased.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
