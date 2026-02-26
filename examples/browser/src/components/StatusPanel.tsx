import { useState, useEffect } from 'react';
import { ClawSwapClient, StatusResponse } from '@clawswap/sdk';

interface Props {
  client: ClawSwapClient;
  swapId: string;
}

export function StatusPanel({ client, swapId }: Props) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [polling, setPolling] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!swapId || !polling) return;

    // Initial fetch
    fetchStatus();

    // Poll for updates
    const interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, [swapId, polling, client]);

  const fetchStatus = async () => {
    try {
      const result = await client.getStatus(swapId);
      setStatus(result);

      // Stop polling on terminal status
      if (['completed', 'failed'].includes(result.status)) {
        setPolling(false);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!status) {
    return <div className="loading">Loading status...</div>;
  }

  const isSuccess = status.status === 'completed';
  const statusClass = isSuccess ? 'success' :
                      status.status === 'failed' ? 'error' :
                      'info';

  return (
    <div className="status-panel">
      <div className={`status-badge ${statusClass}`}>
        {status.status.toUpperCase()}
      </div>

      <div className="status-details">
        <div className="detail-row">
          <span>Request ID:</span>
          <code>{status.requestId}</code>
        </div>
        <div className="detail-row">
          <span>Source:</span>
          <span>{status.sourceChain}</span>
        </div>
        <div className="detail-row">
          <span>Destination:</span>
          <span>{status.destinationChain}: {status.outputAmount}</span>
        </div>
        {status.sourceTxHash && (
          <div className="detail-row">
            <span>Source TX:</span>
            <code>{status.sourceTxHash.slice(0, 10)}...{status.sourceTxHash.slice(-8)}</code>
          </div>
        )}
        {status.destinationTxHash && (
          <div className="detail-row">
            <span>Destination TX:</span>
            <code>{status.destinationTxHash.slice(0, 10)}...{status.destinationTxHash.slice(-8)}</code>
          </div>
        )}
        {status.completedAt && (
          <div className="detail-row">
            <span>Completed at:</span>
            <span>{new Date(status.completedAt).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {isSuccess && (
        <div className="success-message">
          Swap completed successfully! You received {status.outputAmount} tokens.
        </div>
      )}

      {status.status === 'failed' && (
        <div className="error-message">
          Swap failed.
        </div>
      )}

      {polling && (
        <div className="polling-indicator">
          <span className="spinner">&#x21BB;</span>
          <span>Polling for updates...</span>
        </div>
      )}
    </div>
  );
}
