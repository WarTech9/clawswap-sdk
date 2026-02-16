import type {
  ClawSwapConfig,
  QuoteRequest,
  QuoteResponse,
  SwapRequest,
  ExecuteSwapResponse,
  StatusResponse,
  WaitForSettlementOptions,
  Chain,
  Token,
} from './types';
import { HttpClient } from './utils/http';
import { poll, isTerminalStatus } from './utils/polling';
import { quoteRequestSchema, swapRequestSchema, statusRequestSchema } from './schemas';

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
   * Execute a cross-chain swap using a quote ID
   * Protected by x402 - requires payment ($0.10 USDC)
   * Fetch must be x402-wrapped for automatic payment handling
   *
   * Returns a partially-signed transaction that must be:
   * 1. Signed by the user
   * 2. Submitted to Solana RPC
   * 3. Then poll status using the quote ID
   *
   * @returns Transaction to sign and metadata
   */
  async executeSwap(request: SwapRequest): Promise<ExecuteSwapResponse> {
    const validated = swapRequestSchema.parse(request);
    return this.http.post<ExecuteSwapResponse>('/api/swap/execute', validated);
  }

  /**
   * Get the status of a swap using the order ID (quote ID)
   * Free endpoint - no x402 payment required
   *
   * @param orderId The order ID (same as the quote ID)
   */
  async getStatus(orderId: string): Promise<StatusResponse> {
    const validated = statusRequestSchema.parse({ swapId: orderId });
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
   * Get token information including decimals
   * Helper method for executing swaps
   */
  async getTokenInfo(chainId: string, tokenAddress: string): Promise<Token> {
    const tokens = await this.getSupportedTokens(chainId);
    const token = tokens.find(t => t.address === tokenAddress);
    if (!token) {
      throw new Error(`Token ${tokenAddress} not found on chain ${chainId}`);
    }
    return token;
  }

  /**
   * Get supported token pairs
   * Derived from chains and tokens - no dedicated endpoint yet
   */
  async getSupportedPairs(): Promise<
    Array<{
      sourceChain: string;
      sourceToken: string;
      destinationChain: string;
      destinationToken: string;
    }>
  > {
    const chains = await this.getSupportedChains();
    const pairs = [];

    for (const sourceChain of chains) {
      const sourceTokens = await this.getSupportedTokens(sourceChain.id);
      for (const destChain of chains) {
        if (sourceChain.id === destChain.id) continue;
        const destTokens = await this.getSupportedTokens(destChain.id);

        for (const sourceToken of sourceTokens) {
          for (const destToken of destTokens) {
            // Only add pairs with matching symbols (e.g., USDC -> USDC)
            if (sourceToken.symbol === destToken.symbol) {
              pairs.push({
                sourceChain: sourceChain.id,
                sourceToken: sourceToken.address,
                destinationChain: destChain.id,
                destinationToken: destToken.address,
              });
            }
          }
        }
      }
    }

    return pairs;
  }
}
