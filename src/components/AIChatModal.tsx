import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Brain, Bot } from 'lucide-react';

interface NFT {
  id: string;
  name: string;
  image: string;
}

interface AIChatModalProps {
  nft: NFT | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatModal = ({ nft, isOpen, onClose }: AIChatModalProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    setIsGenerating(true);
    setAiResponse(''); // Clear previous response

    // Simulate AI response
    setTimeout(() => {
      setAiResponse("Hello! I'm your AI NFT companion. This is just a UI preview - the actual AI functionality will be implemented soon. I'm ready to help you with your query!");
      setIsGenerating(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearAll = () => {
    setInputMessage('');
    setAiResponse('');
    setIsGenerating(false);
  };

  if (!nft) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col bg-gradient-card border-border/50">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <img
              src={nft.image}
              alt={nft.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex flex-col items-start">
              <span className="text-lg">{nft.name}</span>
              <Badge variant="secondary" className="flex items-center gap-1 mt-1">
                <Brain className="h-3 w-3" />
                Smart NFT
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Ask your AI-powered NFT companion anything
          </DialogDescription>
        </DialogHeader>

        {/* Input Area */}
        <div className="flex gap-2 p-4 border-b border-border/50">
          <Input
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isGenerating}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button 
            onClick={clearAll} 
            variant="outline"
            className="px-4"
          >
            Clear
          </Button>
        </div>

        {/* Response Area */}
        <div className="flex-1 p-4">
          {isGenerating ? (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">AI is thinking...</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          ) : aiResponse ? (
            <div className="flex gap-3 p-4 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium mb-2">AI Response:</div>
                <Textarea
                  value={aiResponse}
                  readOnly
                  className="min-h-[200px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Send a message to start chatting with your AI NFT companion</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};