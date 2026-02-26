import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { SwapForm } from './components/SwapForm';
import { SwapProgress } from './components/SwapProgress';
import { usePhantomWallet } from './hooks/usePhantomWallet';
import './styles.css';

export function App() {
  const { isConnected } = useAccount();
  const phantom = usePhantomWallet();
  const [requestId, setRequestId] = useState<string | null>(null);

  const anyConnected = isConnected || phantom.connected;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>ClawSwap SDK</h1>
          <p>Cross-chain swaps with wagmi v2 + ConnectKit</p>
        </div>
        <div className="wallet-buttons">
          <ConnectKitButton />
          {!phantom.connected ? (
            <button onClick={phantom.connect} className="btn btn-phantom">
              Connect Phantom
            </button>
          ) : (
            <div className="phantom-badge">
              <span className="phantom-label">Phantom</span>
              <span className="phantom-address">
                {phantom.publicKey?.slice(0, 4)}...{phantom.publicKey?.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {!anyConnected ? (
          <div className="connect-prompt">
            <h2>Connect your wallet to get started</h2>
            <p>This example demonstrates ClawSwap SDK integration with wagmi v2 and ConnectKit.</p>
            <p>Connect MetaMask for Base swaps, Phantom for Solana swaps, or both.</p>
          </div>
        ) : (
          <>
            <section className="card">
              <h2>Swap</h2>
              <SwapForm onSwapInitiated={setRequestId} phantom={phantom} />
            </section>

            {requestId && (
              <section className="card">
                <h2>Settlement Status</h2>
                <SwapProgress requestId={requestId} phantom={phantom} />
              </section>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Powered by <a href="https://github.com/WarTech9/clawswap-sdk" target="_blank" rel="noopener noreferrer">ClawSwap SDK</a>
          {' | '}
          <a href="https://wagmi.sh" target="_blank" rel="noopener noreferrer">wagmi v2</a>
          {' | '}
          <a href="https://docs.family.co/connectkit" target="_blank" rel="noopener noreferrer">ConnectKit</a>
        </p>
      </footer>
    </div>
  );
}
