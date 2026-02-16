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
      if (['completed', 'failed', 'expired'].includes(result.status)) {
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

  const statusClass = status.status === 'completed' ? 'success' :
                      status.status === 'failed' ? 'error' :
                      status.status === 'expired' ? 'warning' :
                      'info';

  return (
    <div className="status-panel">
      <div className={`status-badge ${statusClass}`}>
        {status.status.toUpperCase()}
      </div>

      <div className="status-details">
        <div className="detail-row">
          <span>Swap ID:</span>
          <code>{status.swapId}</code>
        </div>
        <div className="detail-row">
          <span>Source:</span>
          <span>{status.sourceChainId}: {status.sourceAmount}</span>
        </div>
        <div className="detail-row">
          <span>Destination:</span>
          <span>{status.destinationChainId}: {status.destinationAmount}</span>
        </div>
      </div>

      {status.transactions && status.transactions.length > 0 && (
        <div className="transactions">
          <h4>Transactions</h4>
          {status.transactions.map((tx, i) => (
            <div key={i} className="transaction">
              <div className="tx-header">
                <span className="tx-chain">{tx.chainId}</span>
                <span className={`tx-status ${tx.status}`}>{tx.status}</span>
              </div>
              <div className="tx-hash">
                {tx.explorerUrl ? (
                  <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                  </a>
                ) : (
                  <code>{tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}</code>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {status.status === 'completed' && (
        <div className="success-message">
          ✨ Swap completed successfully! You received {status.destinationAmount} tokens.
        </div>
      )}

      {status.status === 'failed' && status.failureReason && (
        <div className="error-message">
          ❌ Swap failed: {status.failureReason}
        </div>
      )}

      {polling && (
        <div className="polling-indicator">
          <span className="spinner">⟳</span>
          <span>Polling for updates...</span>
        </div>
      )}
    </div>
  );
}
