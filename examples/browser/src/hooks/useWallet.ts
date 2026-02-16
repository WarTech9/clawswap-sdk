import { useState, useEffect } from 'react';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { createWalletClient, custom, type Address } from 'viem';
import { base } from 'viem/chains';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);
  const [fetchWithPayment, setFetchWithPayment] = useState<typeof fetch | null>(null);

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          // Auto-connect if already authorized
          connect();
        }
      });
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const account = accounts[0] as Address;
      setAddress(account);

      // Create wallet client
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(window.ethereum),
      });

      // Setup x402 payment (lazy load for browser compatibility)
      const { x402Client } = await import('@x402/core');
      const client = new x402Client();
      registerExactEvmScheme(client, {
        signer: { address: account },
        network: 'eip155:8453', // Base mainnet
      });

      const wrapped = wrapFetchWithPayment(fetch, client);
      setFetchWithPayment(() => wrapped);
      setConnected(true);

      console.log('Wallet connected:', account);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return { connected, address, connect, fetchWithPayment };
}
