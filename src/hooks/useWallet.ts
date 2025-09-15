import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export interface WalletState {
  account: string | null;
  balance: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const TEN_CHAIN_ID = 443;

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    account: null,
    balance: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });
  const [hasManuallyDisconnected, setHasManuallyDisconnected] = useState(false);

  const updateBalance = async (account: string) => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(account);
        const balanceInEth = ethers.formatEther(balance);
        setWallet(prev => ({ ...prev, balance: parseFloat(balanceInEth).toFixed(4) }));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const detectProvider = async (): Promise<boolean> => {
    if (window.ethereum) return true;
    
    // Wait for MetaMask to load (up to 3 seconds)
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (window.ethereum) return true;
    }
    return false;
  };

  const connectWallet = async () => {
    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));
    setHasManuallyDisconnected(false); // Clear the manual disconnect flag

    // Check if MetaMask is available or wait for it to load
    const hasProvider = await detectProvider();
    
    if (!hasProvider) {
      setWallet(prev => ({ 
        ...prev, 
        error: 'MetaMask is not installed. Please install MetaMask extension.',
        isConnecting: false
      }));
      return;
    }

    try {
      // Double check window.ethereum is available
      if (!window.ethereum) {
        throw new Error('MetaMask provider not available');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      const account = accounts[0];
      const numericChainId = parseInt(chainId, 16);

      setWallet(prev => ({
        ...prev,
        account,
        chainId: numericChainId,
        isConnected: true,
        isConnecting: false,
      }));

      await updateBalance(account);
    } catch (error: any) {
      setWallet(prev => ({
        ...prev,
        error: error.message || 'Failed to connect wallet',
        isConnecting: false,
      }));
    }
  };

  const disconnectWallet = () => {
    setHasManuallyDisconnected(true); // Set flag to prevent auto-reconnection
    setWallet({
      account: null,
      balance: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  };

  const switchToTenNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${TEN_CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        setWallet(prev => ({ ...prev, error: 'Please add TEN Network to your wallet manually' }));
      } else {
        setWallet(prev => ({ ...prev, error: 'Failed to switch network' }));
      }
    }
  };

  const switchAccount = async () => {
    if (!window.ethereum) return;
    
    setWallet(prev => ({ ...prev, error: null }));
    
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const account = accounts[0];
        setWallet(prev => ({ ...prev, account }));
        await updateBalance(account);
      }
    } catch (error: any) {
      setWallet(prev => ({
        ...prev,
        error: error.message || 'Failed to switch account',
      }));
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      // Only auto-connect if user hasn't manually disconnected
      if (window.ethereum && !hasManuallyDisconnected) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({
              method: 'eth_chainId',
            });

            const account = accounts[0];
            const numericChainId = parseInt(chainId, 16);

            setWallet(prev => ({
              ...prev,
              account,
              chainId: numericChainId,
              isConnected: true,
            }));

            await updateBalance(account);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setWallet(prev => ({ ...prev, account: accounts[0] }));
          updateBalance(accounts[0]);
        }
      };

      const handleChainChanged = (chainId: string) => {
        const numericChainId = parseInt(chainId, 16);
        setWallet(prev => ({ ...prev, chainId: numericChainId }));
        
        if (wallet.account) {
          updateBalance(wallet.account);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [hasManuallyDisconnected]);

  return {
    ...wallet,
    connectWallet,
    disconnectWallet,
    switchToTenNetwork,
    switchAccount,
    isOnTenNetwork: wallet.chainId === TEN_CHAIN_ID,
    TEN_CHAIN_ID,
  };
};