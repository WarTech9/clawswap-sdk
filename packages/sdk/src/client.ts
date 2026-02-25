import type {
  ClawSwapConfig,
  QuoteRequest,
  QuoteResponse,
  ExecuteSwapResponse,
  StatusResponse,
  WaitForSettlementOptions,
  Chain,
  Token,
  TokenPair,
  SwapFeeBreakdown,
} from './types';
import { UnsupportedChainError, NetworkError } from './errors';
import { HttpClient } from './utils/http';
import { poll, isTerminalStatus } from './utils/polling';
import { quoteRequestSchema, statusRequestSchema } from './schemas';

/**
 * ClawSwap SDK Client (v2)
 *
 * Framework-agnostic TypeScript client for ClawSwap cross-chain swaps.
 * Accepts x402-wrapped fetch function for payment handling.
 *
 * @example
 * ```typescript
 * import { ClawSwapClient } from '@clawswap/sdk';
 * import { wrapFetchWithPayment } from '@x402/fetch';
 *
 * const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);
 * const client = new ClawSwapClient({ fetch: fetchWithPayment });
 *
 * // Get a quote
 * const quote = await client.getQuote({
 *   sourceChain: 'solana',
 *   sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
 *   destinationChain: 'base',
 *   destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
 *   amount: '1000000',
 *   userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
 *   recipient: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
 * });
 *
 * // Execute swap
 * const swap = await client.executeSwap({
 *   sourceChain: 'solana',
 *   sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
 *   destinationChain: 'base',
 *   destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
 *   amount: '1000000',
 *   userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
 *   recipient: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
 * });
 *
 * // Wait for settlement
 * const result = await client.waitForSettlement(swap.requestId);
 * ```
 */
export class ClawSwapClient {
  private http: HttpClient;
  constructor(config: ClawSwapConfig = {}) {
    this.http = new HttpClient(config);
  }

  /**
   * Get a quote for a cross-chain swap
   * Free endpoint - no x402 payment required
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const validated = quoteRequestSchema.parse(request);
    return this.http.post<QuoteResponse>('/api/swap/quote', validated);
  }

  /**
   * Execute a cross-chain swap (bidirectional: Solana ↔ Base)
   *
   * x402 payment ($0.50 USDC on Solana) is only required for Solana-source swaps.
   * Base-source swaps are free — no x402 payment needed.
   *
   * The API fetches a fresh quote internally, so no quote expiry issues.
   * Pass the same parameters you would use for getQuote().
   *
   * Returns transaction data that must be signed and submitted:
   * - Solana source: base64 string → deserialize, sign, submit to Solana RPC
   * - Base source: ordered EvmTransaction[] array → execute sequentially on Base
   *
   * @param request Same parameters as getQuote()
   * @returns Transaction to sign and requestId for tracking
   */
  async executeSwap(request: QuoteRequest): Promise<ExecuteSwapResponse> {
    const validated = quoteRequestSchema.parse(request);
    return this.http.post<ExecuteSwapResponse>('/api/swap/execute', validated);
  }

  /**
   * Get the status of a swap
   * Free endpoint - no x402 payment required
   *
   * @param requestId The request ID returned from executeSwap()
   */
  async getStatus(requestId: string): Promise<StatusResponse> {
    const validated = statusRequestSchema.parse({ requestId });
    return this.http.get<StatusResponse>(`/api/swap/${validated.requestId}/status`);
  }

  /**
   * Wait for swap to reach terminal status (completed or failed)
   * Polls every 3 seconds by default
   *
   * @param requestId The request ID returned from executeSwap()
   */
  async waitForSettlement(
    requestId: string,
    options: WaitForSettlementOptions = {}
  ): Promise<StatusResponse> {
    return poll(
      async () => {
        const status = await this.getStatus(requestId);
        options.onStatusUpdate?.(status);
        return status;
      },
      (status) => !isTerminalStatus(status.status),
      options
    );
  }

  /**
   * Get the current swap fee breakdown
   * Free endpoint - no x402 payment required
   */
  async getSwapFee(): Promise<SwapFeeBreakdown> {
    return this.http.get<SwapFeeBreakdown>('/api/swap/fee');
  }

  /**
   * Get list of supported chains
   * Free endpoint - cached for 1 hour
   */
  async getSupportedChains(): Promise<Chain[]> {
    const response = await this.http.get<{ chains?: Chain[] }>('/api/chains');
    if (!Array.isArray(response.chains)) {
      throw new NetworkError('Unexpected API response: missing chains array');
    }
    return response.chains;
  }

  /**
   * Get list of supported tokens for a chain
   * Free endpoint - cached for 1 hour
   */
  async getSupportedTokens(chainId: string): Promise<Token[]> {
    if (!/^[a-zA-Z0-9_-]+$/.test(chainId)) {
      throw new UnsupportedChainError(`Invalid chain ID: ${chainId}`);
    }
    const response = await this.http.get<{ tokens?: Token[] }>(`/api/tokens/${chainId}`);
    if (!Array.isArray(response.tokens)) {
      throw new NetworkError('Unexpected API response: missing tokens array');
    }
    return response.tokens;
  }

  /**
   * Get all valid cross-chain swap pairs
   * Fetches each chain's tokens once, then computes pairs in-memory
   *
   * @returns Array of valid swap pairs
   */
  async getSupportedPairs(): Promise<TokenPair[]> {
    const chains = await this.getSupportedChains();

    // Fetch each chain's tokens exactly once
    const tokensByChain = new Map<string, Token[]>();
    await Promise.all(
      chains.map(async (chain) => {
        tokensByChain.set(chain.id, await this.getSupportedTokens(chain.id));
      })
    );

    const pairs: TokenPair[] = [];
    for (const sourceChain of chains) {
      const sourceTokens = tokensByChain.get(sourceChain.id) ?? [];
      for (const sourceToken of sourceTokens) {
        for (const destChain of chains) {
          if (sourceChain.id === destChain.id) continue;
          const destTokens = tokensByChain.get(destChain.id) ?? [];
          for (const destToken of destTokens) {
            pairs.push({
              sourceChain,
              sourceToken,
              destinationChain: destChain,
              destinationToken: destToken,
            });
          }
        }
      }
    }

    return pairs;
  }
}
