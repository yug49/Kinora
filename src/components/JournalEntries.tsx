import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, BookOpen, Brain } from 'lucide-react';

export const JournalEntries = () => {
  const [newEntry, setNewEntry] = useState('');

  // Mock data for memory entries - will be replaced with contract calls
  const mockMemoryEntries = [
    {
      id: 1,
      content: "First memory: I was created with the ability to learn and evolve.",
      timestamp: new Date('2024-01-15').toLocaleDateString(),
    },
    {
      id: 2,
      content: "Learning about blockchain technology and smart contracts.",
      timestamp: new Date('2024-01-16').toLocaleDateString(),
    },
    {
      id: 3,
      content: "Interacting with users and building meaningful connections.",
      timestamp: new Date('2024-01-17').toLocaleDateString(),
    },
  ];

  const handleAddEntry = () => {
    if (newEntry.trim()) {
      // TODO: Implement contract call to add journal entry
      console.log('Adding entry:', newEntry);
      setNewEntry('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Entry Card */}
      <Card className="border-primary/20 shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <PlusCircle className="h-5 w-5 text-primary" />
            Add New Journal Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Memory Entry
            </label>
            <Textarea
              placeholder="Enter your new memory or experience..."
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
          <Button 
            onClick={handleAddEntry}
            disabled={!newEntry.trim()}
            className="w-full sm:w-auto"
          >
            <Brain className="h-4 w-4" />
            Add Memory
          </Button>
        </CardContent>
      </Card>

      {/* Memory History Card */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-accent" />
            Memory History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-4">
              {mockMemoryEntries.length > 0 ? (
                mockMemoryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-foreground flex-1 leading-relaxed">
                        {entry.content}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {entry.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No memories recorded yet</p>
                  <p className="text-muted-foreground/60 text-sm">
                    Add your first journal entry above
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};