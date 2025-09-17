import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, AlertTriangle, ChevronDown, RefreshCw, LogOut } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';

export const Header = () => {
  const {
    account,
    balance,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchAccount,
    isOnTenNetwork,
    switchToTenNetwork,
    error,
  } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-lg font-bold text-primary-foreground">CI</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Confidential Intelligence</h1>
            <p className="text-sm text-muted-foreground">AI-Powered NFTs</p>
          </div>
        </div>

        {/* Network Warning */}
        {isConnected && !isOnTenNetwork && (
          <Alert className="absolute top-24 left-1/2 transform -translate-x-1/2 w-96 border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Switch to TEN Network (Chain ID 8443)</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={switchToTenNetwork}
                className="ml-2"
              >
                Switch
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Section */}
        <div className="flex items-center space-x-4">
          {isConnected ? (
            <>
              {/* Balance Display */}
              <div className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-card border">
                <span className="text-sm text-muted-foreground">Balance:</span>
                <span className="font-mono text-sm text-foreground">
                  {balance ? `${balance} ETH` : 'Loading...'}
                </span>
              </div>

              {/* Account Info */}
              <div className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-gradient-card border">
                <div className="h-2 w-2 rounded-full bg-primary shadow-glow animate-pulse"></div>
                <span className="font-mono text-sm text-foreground">
                  {formatAddress(account!)}
                </span>
              </div>

              {/* Account Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    className="hover:shadow-glow transition-all duration-300"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={switchAccount}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Switch Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={disconnectWallet}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button 
              onClick={connectWallet} 
              disabled={isConnecting}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="mx-6 mt-4 border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </header>
  );
};