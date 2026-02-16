import { useState } from 'react';
import { ClawSwapClient, QuoteResponse } from '@clawswap/sdk';

interface Props {
  client: ClawSwapClient;
  quote: QuoteResponse;
  sourceChainId: string;
  sourceTokenAddress: string;
  destinationChainId: string;
  destinationTokenAddress: string;
  senderAddress: string;
  destinationAddress: string;
  onSwapInitiated?: (orderId: string) => void;
}

export function SwapButton({
  client,
  quote,
  sourceChainId,
  sourceTokenAddress,
  destinationChainId,
  destinationTokenAddress,
  senderAddress,
  destinationAddress,
  onSwapInitiated
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExecuteSwap = async () => {
    setLoading(true);
    setError('');

    try {
      // Execute swap with v2 API (no need for getTokenInfo - API handles it)
      const executeResponse = await client.executeSwap({
        sourceChainId: sourceChainId,
        sourceTokenAddress: sourceTokenAddress,
        destinationChainId: destinationChainId,
        destinationTokenAddress: destinationTokenAddress,
        amount: quote.sourceAmount,
        senderAddress: senderAddress,
        recipientAddress: destinationAddress,
      });

      console.log('Swap initiated:', executeResponse);
      onSwapInitiated?.(executeResponse.metadata.orderId);
    } catch (err) {
      console.error('Swap failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute swap');
    } finally {
      setLoading(false);
    }
  };

  const expiresInSeconds = quote.expiresIn;
  const isExpired = expiresInSeconds <= 0;

  return (
    <div className="swap-button-container">
      <div className="swap-summary">
        <div className="summary-row">
          <span>Destination:</span>
          <code>{destinationAddress}</code>
        </div>
        <div className="summary-row">
          <span>Fee (via x402):</span>
          <strong>${parseFloat(quote.fees.totalFeeUsd).toFixed(2)} USDC</strong>
        </div>
      </div>

      <button
        onClick={handleExecuteSwap}
        className="btn btn-primary btn-large"
        disabled={loading || isExpired}
      >
        {loading ? '⏳ Executing swap...' : isExpired ? '❌ Quote expired' : '🚀 Execute Swap'}
      </button>

      {isExpired && (
        <p className="warning">
          ⚠️ This quote has expired. Please get a new quote.
        </p>
      )}

      {error && <div className="error">{error}</div>}

      <p className="info">
        ℹ️ This will charge ${parseFloat(quote.fees.totalFeeUsd).toFixed(2)} USDC from your wallet via x402.
        Make sure you have sufficient USDC balance.
      </p>
    </div>
  );
}
