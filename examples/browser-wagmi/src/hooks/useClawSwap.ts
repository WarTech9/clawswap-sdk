import { useMemo, useState, useCallback } from 'react';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import {
  ClawSwapClient,
  isEvmSource,
  isSolanaSource,
  type QuoteRequest,
  type QuoteResponse,
  type ExecuteSwapResponse,
  type StatusResponse,
} from '@clawswap/sdk';

const API_URL = import.meta.env.VITE_CLAWSWAP_API_URL || 'https://api.clawswap.dev';
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export interface TxProgress {
  step: number;
  total: number;
  description: string;
  hash?: string;
}

interface PhantomState {
  connected: boolean;
  publicKey: string | null;
  getProvider: () => any;
}

export function useClawSwap(phantom?: PhantomState) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [txProgress, setTxProgress] = useState<TxProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create SDK client with x402 payment (both EVM and SVM schemes)
  const client = useMemo(() => {
    const x402 = new x402Client();
    let hasScheme = false;

    // Register EVM scheme if MetaMask connected
    if (walletClient && address) {
      const signer = {
        address,
        signTypedData: async (typedData: {
          domain: Record<string, unknown>;
          types: Record<string, unknown>;
          primaryType: string;
          message: Record<string, unknown>;
        }) => {
          return walletClient.signTypedData({
            account: address,
            domain: typedData.domain as any,
            types: typedData.types as any,
            primaryType: typedData.primaryType,
            message: typedData.message as any,
          });
        },
      };
      registerExactEvmScheme(x402, { signer, networks: ['eip155:8453'] });
      hasScheme = true;
    }

    // Register SVM scheme if Phantom connected
    // Note: SVM scheme registration is async, so we handle it via a wrapper
    if (phantom?.connected && phantom.publicKey) {
      const phantomPubKey = phantom.publicKey;
      const phantomProvider = phantom.getProvider();

      if (phantomProvider) {
        // Lazy-load Solana dependencies and register SVM scheme
        // We use a sync placeholder and register async in the background
        const registerSvm = async () => {
          try {
            const { ExactSvmScheme } = await import('@x402/svm/exact/client');
            const { address: toAddress, getTransactionEncoder } = await import('@solana/kit');
            const { VersionedTransaction } = await import('@solana/web3.js');

            const addr = toAddress(phantomPubKey);
            const signer = {
              address: addr,
              async signTransactions(transactions: any[]) {
                const encoder = getTransactionEncoder();
                return Promise.all(transactions.map(async (tx: any) => {
                  const wireBytes = new Uint8Array(encoder.encode(tx));
                  const legacyTx = VersionedTransaction.deserialize(wireBytes);
                  const signedTx = await phantomProvider.signTransaction(legacyTx);
                  const keyIndex = signedTx.message.staticAccountKeys.findIndex(
                    (key: any) => key.toBase58() === phantomPubKey
                  );
                  if (keyIndex < 0) throw new Error('Phantom did not sign the transaction');
                  return { [addr]: signedTx.signatures[keyIndex] } as any;
                }));
              },
            };
            // Register manually to pass rpcUrl config
            const scheme = new ExactSvmScheme(signer, { rpcUrl: SOLANA_RPC_URL });
            x402.register('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', scheme);
          } catch (err) {
            console.error('Failed to register SVM payment scheme:', err);
          }
        };
        registerSvm();
        hasScheme = true;
      }
    }

    const paymentFetch = wrapFetchWithPayment(fetch.bind(globalThis), x402);
    return new ClawSwapClient({ fetch: paymentFetch, baseUrl: API_URL });
  }, [walletClient, address, phantom?.connected, phantom?.publicKey]);

  const getQuote = useCallback(async (params: QuoteRequest): Promise<QuoteResponse> => {
    setError(null);
    try {
      return await client.getQuote(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote';
      setError(message);
      throw err;
    }
  }, [client]);

  const executeAndSign = useCallback(async (params: QuoteRequest): Promise<ExecuteSwapResponse> => {
    setTxHashes([]);
    setTxProgress(null);
    setError(null);

    try {
      setTxProgress({ step: 0, total: 0, description: 'Requesting swap...' });
      const response = await client.executeSwap(params);

      if (isEvmSource(response)) {
        if (!walletClient || !publicClient) {
          throw new Error('MetaMask wallet not connected. Connect MetaMask to execute Base swaps.');
        }

        const hashes: string[] = [];
        const total = response.transactions.length;

        for (let i = 0; i < total; i++) {
          const tx = response.transactions[i];
          const description = tx.description || `Transaction ${i + 1} of ${total}`;

          setTxProgress({ step: i + 1, total, description: `Signing: ${description}...` });

          const hash = await walletClient.sendTransaction({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: BigInt(tx.value),
          });

          setTxProgress({ step: i + 1, total, description: `Confirming: ${description}...`, hash });
          await publicClient.waitForTransactionReceipt({ hash });

          hashes.push(hash);
          setTxHashes([...hashes]);
        }

        setTxProgress(null);
      } else if (isSolanaSource(response)) {
        // Solana source: sign with Phantom and submit
        const phantomProvider = phantom?.getProvider();
        if (!phantom?.connected || !phantomProvider) {
          throw new Error('Phantom wallet not connected. Connect Phantom to execute Solana swaps.');
        }

        const { Transaction, Connection } = await import('@solana/web3.js');

        setTxProgress({ step: 1, total: 1, description: 'Signing Solana transaction with Phantom...' });

        const txBuffer = Uint8Array.from(atob(response.transaction), c => c.charCodeAt(0));
        const transaction = Transaction.from(txBuffer);
        const signedTx = await phantomProvider.signTransaction(transaction);

        setTxProgress({ step: 1, total: 1, description: 'Submitting to Solana...' });

        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
        const serialized = signedTx.serialize();
        const signature = await connection.sendRawTransaction(serialized, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        setTxHashes([signature]);
        setTxProgress({ step: 1, total: 1, description: 'Waiting for confirmation...', hash: signature });

        await connection.confirmTransaction(signature, 'confirmed');
        setTxProgress(null);
      }

      return response;
    } catch (err) {
      setTxProgress(null);
      const message = err instanceof Error ? err.message : 'Swap failed';
      setError(message);
      throw err;
    }
  }, [walletClient, publicClient, client, phantom]);

  const waitForSettlement = useCallback(async (
    orderId: string,
    onStatusUpdate?: (status: StatusResponse) => void,
  ): Promise<StatusResponse> => {
    return client.waitForSettlement(orderId, {
      timeout: 300_000,
      interval: 3000,
      onStatusUpdate,
    });
  }, [client]);

  return {
    client,
    getQuote,
    executeAndSign,
    waitForSettlement,
    txHashes,
    txProgress,
    error,
    clearError: () => setError(null),
  };
}
