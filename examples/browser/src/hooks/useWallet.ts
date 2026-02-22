import { useState, useEffect, useCallback, useRef } from 'react';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { createWalletClient, createPublicClient, custom, http, type WalletClient, type PublicClient, type Address } from 'viem';
import { base } from 'viem/chains';

// Phantom wallet provider type
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
    ethereum?: any;
    phantom?: { solana?: PhantomProvider };
  }
}

const BASE_CHAIN_ID = '0x2105'; // 8453 in hex
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export function useWallet() {
  // EVM wallet state
  const [evmConnected, setEvmConnected] = useState(false);
  const [evmAddress, setEvmAddress] = useState<Address | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);

  // Solana wallet state
  const [solanaConnected, setSolanaConnected] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);

  // Payment
  const [fetchWithPayment, setFetchWithPayment] = useState<typeof fetch | null>(null);

  // Track wallet state for payment rebuild
  const evmSignerRef = useRef<{ address: Address; signTypedData: any } | null>(null);

  // Check if MetaMask already connected on mount
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts.length > 0) connectEvm();
      })
      .catch((err: unknown) => console.error('Failed to check wallet:', err));
  }, []);

  // Check if Phantom already connected on mount
  useEffect(() => {
    const phantom = window.phantom?.solana;
    if (phantom?.isConnected && phantom.publicKey) {
      setSolanaAddress(phantom.publicKey.toBase58());
      setSolanaConnected(true);
    }
  }, []);

  // Rebuild x402 payment whenever wallet connections change
  useEffect(() => {
    rebuildPaymentFetch();
  }, [evmConnected, solanaConnected]);

  const ensureBaseChain = useCallback(async () => {
    if (!window.ethereum) return;
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== BASE_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } else {
          throw switchError;
        }
      }
    }
  }, []);

  const rebuildPaymentFetch = async () => {
    const { x402Client } = await import('@x402/core/client');
    const client = new x402Client();

    // Register EVM scheme if MetaMask connected
    if (evmSignerRef.current) {
      registerExactEvmScheme(client, {
        signer: evmSignerRef.current,
        networks: ['eip155:8453'],
      });
    }

    // Register SVM scheme if Phantom connected
    const phantom = window.phantom?.solana;
    if (solanaConnected && solanaAddress && phantom) {
      try {
        const { ExactSvmScheme } = await import('@x402/svm/exact/client');
        const { address: toAddress, getTransactionEncoder } = await import('@solana/kit');
        const { VersionedTransaction } = await import('@solana/web3.js');

        const addr = toAddress(solanaAddress);
        const pubKeyStr = solanaAddress;

        const signer = {
          address: addr,
          async signTransactions(transactions: any[]) {
            const encoder = getTransactionEncoder();
            return Promise.all(transactions.map(async (tx: any) => {
              // Serialize v2 Transaction to wire bytes, cast for VersionedTransaction compat
              const wireBytes = new Uint8Array(encoder.encode(tx));
              // Convert to v1 VersionedTransaction for Phantom
              const legacyTx = VersionedTransaction.deserialize(wireBytes);
              // Have Phantom sign it
              const signedTx = await phantom.signTransaction(legacyTx);
              // Find our key index and extract signature
              const keyIndex = signedTx.message.staticAccountKeys.findIndex(
                (key: any) => key.toBase58() === pubKeyStr
              );
              if (keyIndex < 0) {
                throw new Error('Phantom did not sign the transaction');
              }
              return { [addr]: signedTx.signatures[keyIndex] } as any;
            }));
          },
        };

        // Register manually to pass rpcUrl config (registerExactSvmScheme doesn't forward it)
        const scheme = new ExactSvmScheme(signer, { rpcUrl: SOLANA_RPC_URL });
        client.register('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', scheme);
      } catch (err) {
        console.error('Failed to register SVM payment scheme:', err);
      }
    }

    const wrapped = wrapFetchWithPayment(fetch.bind(globalThis), client);
    setFetchWithPayment(() => wrapped);
  };

  const connectEvm = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) throw new Error('No accounts found');

      const account = accounts[0] as Address;
      setEvmAddress(account);

      await ensureBaseChain();

      const wc = createWalletClient({
        account,
        chain: base,
        transport: custom(window.ethereum),
      });
      setWalletClient(wc as any);

      const pc = createPublicClient({ chain: base, transport: http() });
      setPublicClient(pc);

      // Create EVM signer for x402
      evmSignerRef.current = {
        address: account,
        signTypedData: async (typedData: {
          domain: Record<string, unknown>;
          types: Record<string, unknown>;
          primaryType: string;
          message: Record<string, unknown>;
        }) => {
          return wc.signTypedData({
            account,
            domain: typedData.domain as any,
            types: typedData.types as any,
            primaryType: typedData.primaryType,
            message: typedData.message as any,
          });
        },
      };

      setEvmConnected(true);
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      alert(`Failed to connect MetaMask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const connectSolana = async () => {
    const phantom = window.phantom?.solana;
    if (!phantom) {
      alert('Please install Phantom wallet');
      return;
    }

    try {
      const response = await phantom.connect();
      const pubKey = response.publicKey.toBase58();
      setSolanaAddress(pubKey);
      setSolanaConnected(true);
    } catch (error) {
      console.error('Failed to connect Phantom:', error);
      alert(`Failed to connect Phantom: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    // EVM
    evmConnected,
    evmAddress,
    connectEvm,
    walletClient,
    publicClient,
    ensureBaseChain,
    // Solana
    solanaConnected,
    solanaAddress,
    connectSolana,
    // Payment
    fetchWithPayment,
  };
}
