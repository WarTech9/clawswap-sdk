import { useState, useEffect } from 'react';
import { ClawSwapClient } from '@clawswap/sdk';
import { useWallet } from './hooks/useWallet';
import { QuoteForm, SwapParams } from './components/QuoteForm';
import { SwapButton } from './components/SwapButton';
import { StatusPanel } from './components/StatusPanel';
import './styles.css';

const API_URL = import.meta.env.VITE_CLAWSWAP_API_URL || 'https://api.clawswap.dev';

export function App() {
  const {
    evmConnected, evmAddress, connectEvm,
    walletClient, publicClient, ensureBaseChain,
    solanaConnected, solanaAddress, connectSolana,
    fetchWithPayment,
  } = useWallet();

  const [client, setClient] = useState<ClawSwapClient | null>(null);
  const [swapParams, setSwapParams] = useState<SwapParams | null>(null);
  const [swapId, setSwapId] = useState<string | null>(null);

  const anyConnected = evmConnected || solanaConnected;

  // Create client with or without payment
  useEffect(() => {
    if (fetchWithPayment) {
      setClient(new ClawSwapClient({ fetch: fetchWithPayment, baseUrl: API_URL }));
    } else {
      setClient(new ClawSwapClient({ baseUrl: API_URL }));
    }
  }, [fetchWithPayment]);

  return (
    <div className="app">
      <header className="header">
        <h1>ClawSwap SDK Demo</h1>
        <p>Cross-chain swaps powered by AI agents</p>
        <div className="wallet-buttons">
          {!evmConnected ? (
            <button onClick={connectEvm} className="btn btn-primary">
              Connect MetaMask
            </button>
          ) : (
            <div className="wallet-info">
              <span className="connected-badge">MetaMask</span>
              <span className="address">{evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}</span>
            </div>
          )}
          {!solanaConnected ? (
            <button onClick={connectSolana} className="btn btn-secondary">
              Connect Phantom
            </button>
          ) : (
            <div className="wallet-info">
              <span className="connected-badge phantom">Phantom</span>
              <span className="address">{solanaAddress?.slice(0, 4)}...{solanaAddress?.slice(-4)}</span>
            </div>
          )}
        </div>
      </header>

      {!client ? (
        <div className="loading">Loading SDK...</div>
      ) : (
        <main className="main">
          <div className="card">
            <h2>Get Quote</h2>
            <QuoteForm
              client={client}
              walletAddress={evmAddress ?? solanaAddress ?? undefined}
              onSwapParams={setSwapParams}
            />
          </div>

          {swapParams && (
            <div className="card">
              <h2>Execute Swap</h2>
              {!anyConnected ? (
                <p className="info">Connect a wallet to execute the swap</p>
              ) : (
                <SwapButton
                  client={client}
                  quote={swapParams.quote}
                  sourceChainId={swapParams.sourceChainId}
                  sourceTokenAddress={swapParams.sourceTokenAddress}
                  destinationChainId={swapParams.destinationChainId}
                  destinationTokenAddress={swapParams.destinationTokenAddress}
                  senderAddress={swapParams.senderAddress}
                  destinationAddress={swapParams.recipientAddress}
                  walletClient={walletClient}
                  publicClient={publicClient}
                  ensureBaseChain={ensureBaseChain}
                  solanaConnected={solanaConnected}
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
