import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, Download, Copy, ExternalLink } from 'lucide-react';

export const IPFSTest = () => {
  const [uploadData, setUploadData] = useState('');
  const [uploadResult, setUploadResult] = useState<{ cid: string; result: any } | null>(null);
  const [fetchCid, setFetchCid] = useState('');
  const [fetchResult, setFetchResult] = useState<{ content: string; cid: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const handleUpload = async () => {
    if (!uploadData.trim()) {
      toast({
        title: "Error",
        description: "Please enter some data to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ipfs-operations', {
        body: { operation: 'upload', data: uploadData }
      });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      if (data.success) {
        setUploadResult(data);
        toast({
          title: "Success",
          description: `Data uploaded to IPFS! CID: ${data.cid}`,
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      toast({
        title: "Error",
        description: "Failed to upload data to IPFS",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetch = async () => {
    if (!fetchCid.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid CID",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('ipfs-operations', {
        body: { operation: 'fetch', cid: fetchCid }
      });

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

      if (data.success) {
        setFetchResult(data);
        toast({
          title: "Success",
          description: "Data retrieved from IPFS successfully!",
        });
      } else {
        throw new Error(data.error || 'Fetch failed');
      }
    } catch (error) {
      console.error('Error fetching from IPFS:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data from IPFS",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard!",
    });
  };

  const openInGateway = (cid: string) => {
    window.open(`https://gateway.pinata.cloud/ipfs/${cid}`, '_blank');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Data to IPFS
          </CardTitle>
          <CardDescription>
            Enter any text data to store on IPFS via Pinata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-data">Data to Upload</Label>
            <Textarea
              id="upload-data"
              placeholder="Enter your data here..."
              value={uploadData}
              onChange={(e) => setUploadData(e.target.value)}
              rows={4}
            />
          </div>
          
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !uploadData.trim()}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload to IPFS'}
          </Button>

          {uploadResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Upload Result:</h4>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">CID:</Label>
                <code className="text-xs bg-background px-2 py-1 rounded flex-1">{uploadResult.cid}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(uploadResult.cid)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInGateway(uploadResult.cid)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">View Full Response</summary>
                <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                  {JSON.stringify(uploadResult.result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fetch Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Fetch Data from IPFS
          </CardTitle>
          <CardDescription>
            Enter a CID to retrieve data from IPFS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fetch-cid">CID to Fetch</Label>
            <Input
              id="fetch-cid"
              placeholder="Enter IPFS CID (e.g., bafkreidvbhs33ighmljlvr7zbv2ywwzcmp5adtf4kqvlly67cy56bdtmve)"
              value={fetchCid}
              onChange={(e) => setFetchCid(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleFetch} 
            disabled={isFetching || !fetchCid.trim()}
            className="w-full"
          >
            {isFetching ? 'Fetching...' : 'Fetch from IPFS'}
          </Button>

          {fetchResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Fetched Content:</h4>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-xs text-muted-foreground">CID:</Label>
                <code className="text-xs bg-background px-2 py-1 rounded flex-1">{fetchResult.cid}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(fetchResult.cid)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInGateway(fetchResult.cid)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Content:</Label>
                <div className="p-3 bg-background rounded border">
                  <pre className="text-sm whitespace-pre-wrap">{fetchResult.content}</pre>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(fetchResult.content)}
                  className="w-fit"
                >
                  Copy Content
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};