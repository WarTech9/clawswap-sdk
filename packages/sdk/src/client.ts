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
  SwapFeeResponse,
} from './types';
import { HttpClient } from './utils/http';
import { poll, isTerminalStatus } from './utils/polling';
import { quoteRequestSchema, statusRequestSchema } from './schemas';

/**
 * ClawSwap SDK Client
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
 *   sourceChainId: 'solana',
 *   sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
 *   destinationChainId: 'base',
 *   destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
 *   amount: '1000000',
 * });
 *
 * // Execute swap
 * const swap = await client.executeSwap({
 *   ...quote,
 *   destinationAddress: '0x...',
 * });
 *
 * // Wait for settlement
 * const result = await client.waitForSettlement(swap.swapId);
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
   * Execute a cross-chain swap
   * Protected by x402 - requires payment ($0.50 USDC on Solana)
   * Fetch must be x402-wrapped for automatic payment handling
   *
   * The API fetches a fresh quote internally, so no quote expiry issues.
   * Pass the same parameters you would use for getQuote().
   *
   * Returns a partially-signed transaction that must be:
   * 1. Signed by the user
   * 2. Submitted to Solana RPC
   * 3. Then poll status using the returned orderId from metadata
   *
   * @param request Same parameters as getQuote()
   * @returns Transaction to sign and metadata (includes orderId for tracking)
   */
  async executeSwap(request: QuoteRequest): Promise<ExecuteSwapResponse> {
    const validated = quoteRequestSchema.parse(request);
    return this.http.post<ExecuteSwapResponse>('/api/swap/execute', validated);
  }

  /**
   * Get the status of a swap using the order ID (quote ID)
   * Free endpoint - no x402 payment required
   *
   * @param orderId The order ID (same as the quote ID)
   */
  async getStatus(orderId: string): Promise<StatusResponse> {
    const validated = statusRequestSchema.parse({ orderId });
    return this.http.get<StatusResponse>(`/api/swap/${orderId}/status`);
  }

  /**
   * Wait for swap to reach terminal status (fulfilled/completed/failed/cancelled)
   * Polls every 3 seconds by default
   *
   * @param orderId The order ID (same as the quote ID)
   */
  async waitForSettlement(
    orderId: string,
    options: WaitForSettlementOptions = {}
  ): Promise<StatusResponse> {
    return poll(
      () => this.getStatus(orderId),
      (status) => {
        options.onStatusUpdate?.(status);
        return !isTerminalStatus(status.status);
      },
      options
    );
  }

  /**
   * Get the current swap fee
   * Free endpoint - no x402 payment required
   */
  async getSwapFee(): Promise<SwapFeeResponse> {
    return this.http.get<SwapFeeResponse>('/api/swap/fee');
  }

  /**
   * Get list of supported chains
   * Free endpoint - cached for 1 hour
   */
  async getSupportedChains(): Promise<Chain[]> {
    const response = await this.http.get<{ chains: Chain[] }>('/api/chains');
    return response.chains;
  }

  /**
   * Get list of supported tokens for a chain
   * Free endpoint - cached for 1 hour
   */
  async getSupportedTokens(chainId: string): Promise<Token[]> {
    const response = await this.http.get<{ tokens: Token[] }>(`/api/tokens/${chainId}`);
    return response.tokens;
  }

  /**
   * Get all valid cross-chain swap pairs
   * Derives pairs from supported chains and tokens
   * Results are computed client-side from cached chain/token data
   *
   * @returns Array of valid swap pairs
   */
  async getSupportedPairs(): Promise<TokenPair[]> {
    const chains = await this.getSupportedChains();
    const pairs: TokenPair[] = [];

    for (const sourceChain of chains) {
      const sourceTokens = await this.getSupportedTokens(sourceChain.id);
      for (const sourceToken of sourceTokens) {
        for (const destChain of chains) {
          if (sourceChain.id === destChain.id) continue; // Skip same-chain
          const destTokens = await this.getSupportedTokens(destChain.id);
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

  /**
   * Get token information including decimals
   * Helper method for executing swaps
   * @private
   */
  private async getTokenInfo(chainId: string, tokenAddress: string): Promise<Token> {
    const tokens = await this.getSupportedTokens(chainId);
    const token = tokens.find(t => t.address === tokenAddress);
    if (!token) {
      throw new Error(`Token ${tokenAddress} not found on chain ${chainId}`);
    }
    return token;
  }

}
