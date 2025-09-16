import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { MintingForm } from '@/components/MintingForm';
import { NFTGallery } from '@/components/NFTGallery';
import { JournalEntries } from '@/components/JournalEntries';
import { PhalaChat } from '@/components/PhalaChat';
import { IPFSTest } from '@/components/IPFSTest';
import { AESCrypto } from '@/components/AESCrypto';
import { PromptsMonitor } from '@/components/PromptsMonitor';
import { PromptListing } from '@/components/PromptListing';
import { Sparkles, Images, BookOpen, MessageSquare, Database, Shield, Monitor, ShoppingBag } from 'lucide-react';

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
          {/* Main Application Tabs */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 text-center">Main Application</h2>
            <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto mb-6">
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
            </TabsList>
          </div>

          {/* Testing/Development Tabs */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-muted-foreground mb-4 text-center">
              Testing & Development 
              <span className="block text-sm text-destructive mt-1">
                (Development only - will be removed in production)
              </span>
            </h2>
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-6 border-2 border-dashed border-muted-foreground/30">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="ipfs" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                IPFS Test
              </TabsTrigger>
              <TabsTrigger value="crypto" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Encryption Test
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="space-y-8">
            <div className="max-w-4xl mx-auto">
              <PhalaChat />
            </div>
          </TabsContent>
          
          <TabsContent value="ipfs" className="space-y-8">
            <IPFSTest />
          </TabsContent>
          
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
          
          <TabsContent value="crypto" className="space-y-8">
            <div className="max-w-6xl mx-auto">
              <AESCrypto />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
