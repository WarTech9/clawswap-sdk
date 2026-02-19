import { useState, useEffect } from 'react';
import { ClawSwapClient, QuoteResponse } from '@clawswap/sdk';
import { useWallet } from './hooks/useWallet';
import { QuoteForm } from './components/QuoteForm';
import { SwapButton } from './components/SwapButton';
import { StatusPanel } from './components/StatusPanel';
import './styles.css';

const API_URL = import.meta.env.VITE_CLAWSWAP_API_URL || 'https://api.clawswap.dev';

export function App() {
  const { connected, address, connect, fetchWithPayment } = useWallet();
  const [client, setClient] = useState<ClawSwapClient | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [swapId, setSwapId] = useState<string | null>(null);

  // Create client with or without payment
  useEffect(() => {
    if (fetchWithPayment) {
      setClient(new ClawSwapClient({ fetch: fetchWithPayment, baseUrl: API_URL }));
    } else {
      // Create client without payment for free endpoints
      setClient(new ClawSwapClient({ baseUrl: API_URL }));
    }
  }, [fetchWithPayment]);

  return (
    <div className="app">
      <header className="header">
        <h1>🐾 ClawSwap SDK Demo</h1>
        <p>Cross-chain swaps powered by AI agents</p>
        {!connected ? (
          <button onClick={connect} className="btn btn-primary">
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <span className="connected-badge">●</span>
            <span className="address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
        )}
      </header>

      {!client ? (
        <div className="loading">Loading SDK...</div>
      ) : (
        <main className="main">
          <div className="card">
            <h2>Get Quote</h2>
            <QuoteForm client={client} walletAddress={address} onQuote={setQuote} />
          </div>

          {quote && (
            <div className="card">
              <h2>Execute Swap</h2>
              {!connected ? (
                <p className="info">Connect your wallet to execute the swap</p>
              ) : (
                <SwapButton
                  client={client}
                  quote={quote}
                  destinationAddress={address!}
                  onSwapInitiated={setSwapId}
                />
              )}
            </div>
          )}

          {swapId && (
            <div className="card">
              <h2>Swap Status</h2>
              <StatusPanel client={client} swapId={swapId} />
            </div>
          )}
        </main>
      )}

      <footer className="footer">
        <p>
          Powered by <a href="https://github.com/WarTech9/clawswap-sdk" target="_blank">ClawSwap SDK</a>
        </p>
      </footer>
    </div>
  );
}
