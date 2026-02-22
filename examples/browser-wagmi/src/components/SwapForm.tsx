import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { type QuoteResponse, type Chain, type Token } from '@clawswap/sdk';
import { useClawSwap } from '../hooks/useClawSwap';

interface PhantomState {
  connected: boolean;
  publicKey: string | null;
  getProvider: () => any;
}

interface Props {
  onSwapInitiated: (orderId: string) => void;
  phantom?: PhantomState;
}

export function SwapForm({ onSwapInitiated, phantom }: Props) {
  const { address } = useAccount();
  const { client, getQuote, executeAndSign, error, clearError } = useClawSwap(phantom);

  // Discovery state
  const [chains, setChains] = useState<Chain[]>([]);
  const [sourceTokens, setSourceTokens] = useState<Token[]>([]);
  const [destTokens, setDestTokens] = useState<Token[]>([]);

  // Form state
  const [sourceChain, setSourceChain] = useState('');
  const [destChain, setDestChain] = useState('');
  const [sourceToken, setSourceToken] = useState('');
  const [destToken, setDestToken] = useState('');
  const [amount, setAmount] = useState('1000000');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Flow state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [signingStatus, setSigningStatus] = useState('');

  // Load chains
  useEffect(() => {
    client.getSupportedChains().then(setChains).catch(console.error);
  }, [client]);

  // Load source tokens
  useEffect(() => {
    if (sourceChain) {
      setSourceToken('');
      client.getSupportedTokens(sourceChain).then(setSourceTokens).catch(console.error);
    }
  }, [sourceChain, client]);

  // Load dest tokens
  useEffect(() => {
    if (destChain) {
      setDestToken('');
      client.getSupportedTokens(destChain).then(setDestTokens).catch(console.error);
    }
  }, [destChain, client]);

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setQuoteLoading(true);
    setQuote(null);
    clearError();

    try {
      const result = await getQuote({
        sourceChainId: sourceChain,
        sourceTokenAddress: sourceToken,
        destinationChainId: destChain,
        destinationTokenAddress: destToken,
        amount,
        senderAddress: address,
        recipientAddress,
      });
      setQuote(result);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!address || !quote) return;

    setSwapLoading(true);
    setTxHashes([]);
    setSigningStatus('Requesting swap...');
    clearError();

    try {
      const response = await executeAndSign({
        sourceChainId: sourceChain,
        sourceTokenAddress: sourceToken,
        destinationChainId: destChain,
        destinationTokenAddress: destToken,
        amount: quote.sourceAmount,
        senderAddress: address,
        recipientAddress,
      });

      setSigningStatus('');
      onSwapInitiated(response.orderId);
    } catch {
      setSigningStatus('');
    } finally {
      setSwapLoading(false);
    }
  };

  const canQuote = sourceChain && destChain && sourceToken && destToken && amount && address && recipientAddress;
  const isExpired = quote ? quote.expiresIn <= 0 : false;

  return (
    <div className="swap-form">
      <form onSubmit={handleGetQuote}>
        <div className="form-grid">
          <div className="form-group">
            <label>Source Chain</label>
            <select value={sourceChain} onChange={(e) => setSourceChain(e.target.value)} required>
              <option value="">Select chain</option>
              {chains.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Source Token</label>
            <select value={sourceToken} onChange={(e) => setSourceToken(e.target.value)} disabled={!sourceChain} required>
              <option value="">Select token</option>
              {sourceTokens.map((t) => (
                <option key={t.address} value={t.address}>{t.symbol} - {t.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Destination Chain</label>
            <select value={destChain} onChange={(e) => setDestChain(e.target.value)} required>
              <option value="">Select chain</option>
              {chains.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Destination Token</label>
            <select value={destToken} onChange={(e) => setDestToken(e.target.value)} disabled={!destChain} required>
              <option value="">Select token</option>
              {destTokens.map((t) => (
                <option key={t.address} value={t.address}>{t.symbol} - {t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Amount (smallest unit)</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1000000 = 1 USDC"
            required
          />
        </div>

        <div className="form-group">
          <label>Sender Address</label>
          <input type="text" value={address || ''} disabled />
          <small>Using connected wallet address</small>
        </div>

        <div className="form-group">
          <label>Recipient Address</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Recipient wallet address on destination chain"
            required
          />
        </div>

        <button type="submit" className="btn btn-secondary" disabled={!canQuote || quoteLoading}>
          {quoteLoading ? 'Getting quote...' : 'Get Quote'}
        </button>
      </form>

      {quote && (
        <div className="quote-card">
          <h3>Quote</h3>
          <div className="quote-row"><span>You send:</span><strong>{quote.sourceAmount}</strong></div>
          <div className="quote-row"><span>You receive:</span><strong>{quote.destinationAmount}</strong></div>
          <div className="quote-row"><span>Fee:</span><span>${quote.fees.totalEstimatedFeeUsd.toFixed(2)}</span></div>
          <div className="quote-row"><span>Est. time:</span><span>{quote.estimatedTimeSeconds}s</span></div>
          <div className="quote-row warning"><span>Expires in:</span><strong>{quote.expiresIn}s</strong></div>

          <button
            onClick={handleExecuteSwap}
            className="btn btn-primary"
            disabled={swapLoading || isExpired}
          >
            {swapLoading ? (signingStatus || 'Processing...') : isExpired ? 'Quote expired' : 'Execute Swap'}
          </button>
        </div>
      )}

      {txHashes.length > 0 && (
        <div className="tx-list">
          {txHashes.map((hash, i) => (
            <a key={i} href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="tx-link">
              TX {i + 1}: {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          ))}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
