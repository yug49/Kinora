import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Clock, Loader2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

const LEGACY_CONTRACT_ADDRESS = '0xD704a953D33AD97435e35AB18b9b60961E7f230a';

const LEGACY_ABI = [
  'function ping() public',
  'function getLastPingedTimeStamp() external view returns (uint256)'
];

export const Legacy = () => {
  const { account, isConnected, isOnTenNetwork } = useWallet();
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [pinging, setPinging] = useState(false);
  const [loading, setLoading] = useState(false);

  const ONE_YEAR_SECONDS = (365 * 24 * 60 * 60) + (4 * 60 * 60); // 365 days + 4 hours

  const fetchLastPingTime = async () => {
    if (!isConnected || !isOnTenNetwork || !account) return;

    setLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(LEGACY_CONTRACT_ADDRESS, LEGACY_ABI, provider);

      const timestamp = await contract.getLastPingedTimeStamp();
      setLastPingTime(Number(timestamp));
      
      console.log('Last ping timestamp:', timestamp.toString());
    } catch (error) {
      console.error('Error fetching last ping time:', error);
      toast.error('Failed to fetch last ping time');
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
    if (!account) return;

    setPinging(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LEGACY_CONTRACT_ADDRESS, LEGACY_ABI, signer);

      console.log('Sending ping transaction...');
      const tx = await contract.ping();
      console.log('Ping transaction sent:', tx.hash);

      toast.success('Ping initiated! Waiting for confirmation...');

      await tx.wait();
      console.log('Ping confirmed:', tx.hash);

      toast.success('Successfully pinged! Timer reset.');

      // Refresh the last ping time
      await fetchLastPingTime();
    } catch (error) {
      console.error('Ping failed:', error);
      toast.error(error instanceof Error ? error.message : 'Ping failed');
    } finally {
      setPinging(false);
    }
  };

  const calculateTimeRemaining = () => {
    if (lastPingTime === null) return;

    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedTime = currentTime - lastPingTime;
    const remaining = ONE_YEAR_SECONDS - elapsedTime;

    if (remaining <= 0) {
      setTimeRemaining('Time expired! Please ping immediately.');
      return;
    }

    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    const seconds = remaining % 60;

    setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
  };

  useEffect(() => {
    fetchLastPingTime();
  }, [isConnected, isOnTenNetwork, account]);

  useEffect(() => {
    if (lastPingTime === null) return;

    // Update timer immediately
    calculateTimeRemaining();

    // Update timer every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [lastPingTime]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            Legacy System
          </CardTitle>
          <CardDescription>
            Manage your digital legacy. Ping once a year to maintain access, or your nominees will receive your assets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="text-center py-12">
              <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground">Connect your wallet to access the Legacy System</p>
            </div>
          ) : !isOnTenNetwork ? (
            <div className="text-center py-12">
              <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Switch to TEN Network</h3>
              <p className="text-muted-foreground">Switch to TEN Network to access the Legacy System</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading legacy information...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Timer Display */}
              {lastPingTime !== null && lastPingTime > 0 ? (
                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Time Until Next Ping Required</h3>
                  </div>
                  <div className="text-4xl font-bold text-primary mb-2 font-mono">
                    {timeRemaining}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last pinged: {new Date(lastPingTime * 1000).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    You haven't pinged yet. Send an NFT to the Legacy System first, or ping to start your timer.
                  </p>
                </div>
              )}

              {/* Ping Button */}
              <div className="text-center">
                <Button
                  onClick={handlePing}
                  disabled={pinging}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {pinging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Pinging...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Ping Now
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Ping to reset your 365-day timer
                </p>
              </div>

              {/* Information Card */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-foreground mb-3">How Legacy System Works:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Transfer NFTs to the Legacy System with a nominee address (from Your NFTs tab)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Ping at least once per year (365 days + 4 hours) to maintain ownership</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>If you don't ping in time, your nominee will receive your NFTs and assets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Each ping resets the timer back to 365 days + 4 hours</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
