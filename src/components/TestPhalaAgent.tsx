import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const TestPhalaAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testPhalaAgent = async () => {
    try {
      setIsLoading(true);
      console.log('Testing Phala agent API...');
      
      const { data, error } = await supabase.functions.invoke('test-phala-agent');
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('Test result:', data);
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Success!",
          description: "Phala agent API test completed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "API test failed",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error testing Phala agent:', error);
      toast({
        title: "Error",
        description: "Failed to test Phala agent API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Phala Agent API Test</CardTitle>
        <CardDescription>
          Test the connection to the Phala network agent using TRAITS_AGENT_API_KEY
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testPhalaAgent} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test Phala Agent API'}
        </Button>
        
        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Test Result:</h3>
            <pre className="text-sm overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};