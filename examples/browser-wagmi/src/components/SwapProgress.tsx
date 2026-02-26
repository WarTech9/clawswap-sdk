import { useState, useEffect } from 'react';
import { type StatusResponse } from '@clawswap/sdk';
import { useClawSwap } from '../hooks/useClawSwap';

interface PhantomState {
  connected: boolean;
  publicKey: string | null;
  getProvider: () => any;
}

interface Props {
  requestId: string;
  phantom?: PhantomState;
}

export function SwapProgress({ requestId, phantom }: Props) {
  const { waitForSettlement } = useClawSwap(phantom);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await waitForSettlement(requestId, (s) => {
          if (!cancelled) setStatus(s);
        });
        if (!cancelled) {
          setStatus(result);
          setSettled(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to get status');
        }
      }
    }

    poll();

    return () => { cancelled = true; };
  }, [requestId, waitForSettlement]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!status) {
    return <div className="progress-loading">Loading swap status...</div>;
  }

  const isSuccess = status.status === 'completed';
  const isFailed = status.status === 'failed';

  return (
    <div className="swap-progress">
      <div className={`status-indicator ${isSuccess ? 'success' : isFailed ? 'failed' : 'pending'}`}>
        {status.status.toUpperCase()}
      </div>

      <div className="progress-details">
        <div className="progress-row">
          <span>Request ID:</span>
          <code>{status.requestId}</code>
        </div>
        <div className="progress-row">
          <span>Source:</span>
          <span>{status.sourceChain}</span>
        </div>
        <div className="progress-row">
          <span>Destination:</span>
          <span>{status.destinationChain}: {status.outputAmount}</span>
        </div>
        {status.sourceTxHash && (
          <div className="progress-row">
            <span>Source TX:</span>
            <code>{status.sourceTxHash.slice(0, 10)}...{status.sourceTxHash.slice(-8)}</code>
          </div>
        )}
        {status.destinationTxHash && (
          <div className="progress-row">
            <span>Dest TX:</span>
            <code>{status.destinationTxHash.slice(0, 10)}...{status.destinationTxHash.slice(-8)}</code>
          </div>
        )}
      </div>

      {isSuccess && (
        <div className="success-banner">
          Swap completed! Received {status.outputAmount} tokens.
        </div>
      )}

      {isFailed && (
        <div className="error-banner">
          Swap failed.
        </div>
      )}

      {!settled && (
        <div className="polling-badge">
          Waiting for settlement...
        </div>
      )}
    </div>
  );
}
