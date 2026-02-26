import { useState } from 'react';
import { ClawSwapClient, QuoteResponse, isEvmSource, isSolanaSource } from '@clawswap/sdk';
import type { WalletClient, PublicClient } from 'viem';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

interface Props {
  client: ClawSwapClient;
  quote: QuoteResponse;
  sourceChain: string;
  sourceToken: string;
  destinationChain: string;
  destinationToken: string;
  userWallet: string;
  recipient: string;
  amount: string;
  walletClient: WalletClient | null;
  publicClient: PublicClient | null;
  ensureBaseChain: () => Promise<void>;
  solanaConnected: boolean;
  onSwapInitiated?: (requestId: string) => void;
}

interface TxResult {
  hash: string;
  description?: string;
  explorer?: string;
}

export function SwapButton({
  client,
  quote,
  sourceChain,
  sourceToken,
  destinationChain,
  destinationToken,
  userWallet,
  recipient,
  amount,
  walletClient,
  publicClient,
  ensureBaseChain,
  solanaConnected,
  onSwapInitiated
}: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [txResults, setTxResults] = useState<TxResult[]>([]);

  const handleExecuteSwap = async () => {
    setLoading(true);
    setError('');
    setStatus('Requesting swap...');
    setTxResults([]);

    try {
      const executeResponse = await client.executeSwap({
        sourceChain,
        sourceToken,
        destinationChain,
        destinationToken,
        amount,
        userWallet,
        recipient,
      });

      console.log('Swap response:', executeResponse);

      if (isEvmSource(executeResponse)) {
        // EVM source (Base -> Solana): sign and submit each transaction
        if (!walletClient || !publicClient) {
          setError('MetaMask wallet not connected. Connect MetaMask to execute Base swaps.');
          setLoading(false);
          return;
        }

        await ensureBaseChain();

        for (let i = 0; i < executeResponse.transactions.length; i++) {
          const tx = executeResponse.transactions[i];
          const stepLabel = tx.description || `Transaction ${i + 1} of ${executeResponse.transactions.length}`;
          setStatus(`Signing: ${stepLabel}...`);

          const txHash = await walletClient.sendTransaction({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: BigInt(tx.value),
          });

          setStatus(`Waiting for confirmation: ${stepLabel}...`);
          await publicClient.waitForTransactionReceipt({ hash: txHash });

          setTxResults(prev => [...prev, {
            hash: txHash,
            description: tx.description,
            explorer: `https://basescan.org/tx/${txHash}`,
          }]);
          console.log(`TX confirmed: ${txHash}`);
        }

        setStatus('Transactions submitted! Waiting for cross-chain settlement...');
      } else if (isSolanaSource(executeResponse)) {
        // Solana source (Solana -> Base): sign with Phantom and submit
        if (!solanaConnected || !window.phantom?.solana) {
          setError('Phantom wallet not connected. Connect Phantom to execute Solana swaps.');
          setLoading(false);
          return;
        }

        const phantom = window.phantom.solana;
        const { Transaction, Connection } = await import('@solana/web3.js');

        setStatus('Signing Solana transaction with Phantom...');

        // Decode the base64 transaction from the API
        const txBuffer = Uint8Array.from(atob(executeResponse.transaction), c => c.charCodeAt(0));
        const transaction = Transaction.from(txBuffer);

        // Have Phantom sign it
        const signedTx = await phantom.signTransaction(transaction);

        setStatus('Submitting transaction to Solana...');

        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

        const serialized = signedTx.serialize();
        const signature = await connection.sendRawTransaction(serialized, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        setTxResults([{
          hash: signature,
          description: 'Solana swap transaction',
          explorer: `https://solscan.io/tx/${signature}`,
        }]);

        setStatus('Transaction submitted! Waiting for confirmation...');

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');
        setStatus('Transaction confirmed! Waiting for cross-chain settlement...');
      }

      onSwapInitiated?.(executeResponse.requestId);
    } catch (err) {
      console.error('Swap failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute swap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="swap-button-container">
      <div className="swap-summary">
        <div className="summary-row">
          <span>You receive:</span>
          <strong>{quote.estimatedOutputFormatted}</strong>
        </div>
        <div className="summary-row">
          <span>Recipient:</span>
          <code>{recipient.slice(0, 10)}...{recipient.slice(-6)}</code>
        </div>
        <div className="summary-row">
          <span>Estimated time:</span>
          <strong>{quote.estimatedTime}s</strong>
        </div>
      </div>

      <button
        onClick={handleExecuteSwap}
        className="btn btn-primary btn-large"
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Execute Swap'}
      </button>

      {status && <div className="info">{status}</div>}

      {txResults.length > 0 && (
        <div className="tx-results">
          <h4>Transactions</h4>
          {txResults.map((tx, i) => (
            <div key={i} className="tx-result">
              <span>{tx.description || `Transaction ${i + 1}`}:</span>
              <a
                href={tx.explorer || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
              </a>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
