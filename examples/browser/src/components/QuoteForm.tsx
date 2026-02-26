import { useState, useEffect } from 'react';
import { ClawSwapClient, Chain, Token, QuoteResponse } from '@clawswap/sdk';

export interface SwapParams {
  quote: QuoteResponse;
  sourceChain: string;
  sourceToken: string;
  destinationChain: string;
  destinationToken: string;
  userWallet: string;
  recipient: string;
  amount: string;
}

interface Props {
  client: ClawSwapClient;
  walletAddress?: string;
  onSwapParams?: (params: SwapParams) => void;
}

export function QuoteForm({ client, walletAddress, onSwapParams }: Props) {
  const [chains, setChains] = useState<Chain[]>([]);
  const [sourceChain, setSourceChain] = useState('');
  const [destChain, setDestChain] = useState('');
  const [sourceTokens, setSourceTokens] = useState<Token[]>([]);
  const [destTokens, setDestTokens] = useState<Token[]>([]);
  const [sourceToken, setSourceToken] = useState('');
  const [destToken, setDestToken] = useState('');
  const [amount, setAmount] = useState('1000000');
  const [senderAddress, setSenderAddress] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set sender address from wallet when available
  useEffect(() => {
    if (walletAddress) {
      setSenderAddress(walletAddress);
    }
  }, [walletAddress]);

  // Load chains on mount
  useEffect(() => {
    client.getSupportedChains()
      .then(setChains)
      .catch(err => setError(`Failed to load chains: ${err.message}`));
  }, [client]);

  // Load tokens when source chain changes
  useEffect(() => {
    if (sourceChain) {
      setSourceToken('');
      client.getSupportedTokens(sourceChain)
        .then(setSourceTokens)
        .catch(err => setError(`Failed to load source tokens: ${err.message}`));
    }
  }, [sourceChain, client]);

  // Load tokens when dest chain changes
  useEffect(() => {
    if (destChain) {
      setDestToken('');
      client.getSupportedTokens(destChain)
        .then(setDestTokens)
        .catch(err => setError(`Failed to load destination tokens: ${err.message}`));
    }
  }, [destChain, client]);

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setQuote(null);

    try {
      const result = await client.getQuote({
        sourceChain,
        sourceToken,
        destinationChain: destChain,
        destinationToken: destToken,
        amount,
        userWallet: senderAddress,
        recipient: recipientAddress,
        slippageTolerance: 0.01,
      });

      setQuote(result);
      onSwapParams?.({
        quote: result,
        sourceChain,
        sourceToken,
        destinationChain: destChain,
        destinationToken: destToken,
        userWallet: senderAddress,
        recipient: recipientAddress,
        amount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = sourceChain && destChain && sourceToken && destToken && amount && senderAddress && recipientAddress && !loading;

  return (
    <form onSubmit={handleGetQuote} className="quote-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="sourceChain">Source Chain</label>
          <select
            id="sourceChain"
            value={sourceChain}
            onChange={(e) => setSourceChain(e.target.value)}
            required
          >
            <option value="">Select chain</option>
            {chains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="sourceToken">Source Token</label>
          <select
            id="sourceToken"
            value={sourceToken}
            onChange={(e) => setSourceToken(e.target.value)}
            disabled={!sourceChain}
            required
          >
            <option value="">Select token</option>
            {sourceTokens.map((t) => (
              <option key={t.address} value={t.address}>
                {t.symbol} - {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="destChain">Destination Chain</label>
          <select
            id="destChain"
            value={destChain}
            onChange={(e) => setDestChain(e.target.value)}
            required
          >
            <option value="">Select chain</option>
            {chains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="destToken">Destination Token</label>
          <select
            id="destToken"
            value={destToken}
            onChange={(e) => setDestToken(e.target.value)}
            disabled={!destChain}
            required
          >
            <option value="">Select token</option>
            {destTokens.map((t) => (
              <option key={t.address} value={t.address}>
                {t.symbol} - {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (smallest unit)"
          required
        />
        <small>Enter amount in smallest unit (e.g., 1000000 = 1 USDC)</small>
      </div>

      <div className="form-group">
        <label htmlFor="senderAddress">Sender Address</label>
        <input
          id="senderAddress"
          type="text"
          value={senderAddress}
          onChange={(e) => setSenderAddress(e.target.value)}
          placeholder="Sender wallet address on source chain"
          required
        />
        <small>{walletAddress ? 'Using connected wallet address' : 'Enter sender address'}</small>
      </div>

      <div className="form-group">
        <label htmlFor="recipientAddress">Recipient Address</label>
        <input
          id="recipientAddress"
          type="text"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          placeholder="Recipient wallet address on destination chain"
          required
        />
        <small>Address that will receive the swapped tokens</small>
      </div>

      <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
        {loading ? 'Getting quote...' : 'Get Quote'}
      </button>

      {error && <div className="error">{error}</div>}

      {quote && (
        <div className="quote-result">
          <h3>Quote Details</h3>
          <div className="quote-details">
            <div className="detail-row">
              <span>You send:</span>
              <strong>{amount} (smallest units)</strong>
            </div>
            <div className="detail-row">
              <span>You receive:</span>
              <strong>{quote.estimatedOutputFormatted}</strong>
            </div>
            <div className="detail-row">
              <span>Fees:</span>
              <span>ClawSwap: {quote.fees.clawswap} | Relay: {quote.fees.relay} | Gas: {quote.fees.gas}</span>
            </div>
            <div className="detail-row">
              <span>Estimated time:</span>
              <span>{quote.estimatedTime}s</span>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
