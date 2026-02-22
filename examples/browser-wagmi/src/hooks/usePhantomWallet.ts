import { useState, useCallback, useEffect } from 'react';

interface PhantomProvider {
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signTransaction<T>(transaction: T): Promise<T>;
  signAllTransactions<T>(transactions: T[]): Promise<T[]>;
  isConnected: boolean;
  publicKey: { toBase58(): string } | null;
}

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
  }
}

export function usePhantomWallet() {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const getProvider = useCallback((): PhantomProvider | null => {
    return window.phantom?.solana ?? null;
  }, []);

  // Auto-detect existing connection
  useEffect(() => {
    const phantom = getProvider();
    if (phantom?.isConnected && phantom.publicKey) {
      setPublicKey(phantom.publicKey.toBase58());
      setConnected(true);
    }
  }, [getProvider]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      alert('Please install Phantom wallet');
      return;
    }
    try {
      const response = await provider.connect();
      setPublicKey(response.publicKey.toBase58());
      setConnected(true);
    } catch (err) {
      console.error('Failed to connect Phantom:', err);
    }
  }, [getProvider]);

  const disconnect = useCallback(async () => {
    const provider = getProvider();
    if (provider) {
      await provider.disconnect();
    }
    setPublicKey(null);
    setConnected(false);
  }, [getProvider]);

  return { connected, publicKey, connect, disconnect, getProvider };
}
