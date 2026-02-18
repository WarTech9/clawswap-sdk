/**
 * Core types for ClawSwap SDK
 * Generated from OpenAPI spec with manual refinements
 */

// ============================================================================
// Chain and Token Types
// ============================================================================

export interface Chain {
  id: string;
  name: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
  isTestnet?: boolean;
}

export interface SwapFeeResponse {
  /** Fee amount in the specified currency */
  amount: number;
  /** Fee currency (e.g., "USDC") */
  currency: string;
  /** Network the fee is charged on (e.g., "solana") */
  network: string;
  /** Human-readable description of what the fee covers */
  description: string;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: string;
  logoUri?: string;
  // Token-2022 specific properties
  isToken2022?: boolean;
  transferFeeConfig?: {
    transferFeeBasisPoints: number;
    maximumFee: string;
  };
}

// ============================================================================
// Request Types
// ============================================================================

export interface QuoteRequest {
  sourceChainId: string;
  sourceTokenAddress: string;
  destinationChainId: string;
  destinationTokenAddress: string;
  amount: string; // String to handle big numbers
  senderAddress: string; // Sender's wallet address on source chain
  recipientAddress: string; // Recipient's wallet address on destination chain
  slippageTolerance?: number; // Optional, 0-1 (e.g., 0.01 = 1%)
}

export interface StatusRequest {
  swapId: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface QuoteResponse {
  quoteId: string;
  sourceAmount: string;
  destinationAmount: string;
  fees: {
    bridgeFeeUsd: number;
    x402FeeUsd: number;
    gasReimbursementEstimatedUsd: number;
    totalEstimatedFeeUsd: number;
  };
  estimatedTimeSeconds: number;
  expiresAt: string; // ISO 8601 timestamp
  expiresIn: number; // Seconds until expiry (30s)
}

/**
 * Response from POST /api/swap/execute
 * Returns a partially-signed transaction that the user must sign and submit
 */
export interface ExecuteSwapResponse {
  /** Base64-encoded partially-signed Solana transaction */
  transaction: string;
  /** Order ID for tracking swap status via /api/swap/:id/status */
  orderId: string;
  /** Whether the source token is Token-2022 */
  isToken2022: boolean;
  /** Detailed fee and amount accounting */
  accounting: {
    x402Fee: {
      amountUsd: number;
      currency: string;
      recipient: string;
      note: string;
    };
    gasReimbursement: {
      amountRaw: string;
      amountFormatted: string;
      tokenMint: string;
      recipient: string;
      note: string;
    };
    bridgeFee: {
      estimatedUsd: number;
      note: string;
    };
    sourceAmount: string;
    destinationAmount: string;
  };
}

/**
 * Swap statuses from Relay API
 * Maps to Relay's order statuses
 */
export type SwapStatus =
  | 'pending' // Order created but not yet submitted
  | 'created' // Order submitted to Relay
  | 'fulfilled' // Destination transaction confirmed
  | 'completed' // Same as fulfilled (alias)
  | 'cancelled' // Order cancelled
  | 'failed'; // Order failed

export interface SwapTransaction {
  chainId: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  explorerUrl?: string;
}

/**
 * Response from GET /api/swap/:id/status
 * Based on Relay's OrderInfo structure
 */
export interface StatusResponse {
  /** Order ID (same as quote ID) */
  orderId: string;
  /** Current order status */
  status: SwapStatus;
  /** Source chain ID */
  sourceChainId: string;
  /** Destination chain ID */
  destinationChainId: string;
  /** Source amount in smallest unit */
  sourceAmount: string;
  /** Destination amount in smallest unit */
  destinationAmount: string;
  /** Source chain transaction hash */
  sourceTxHash?: string;
  /** Destination chain transaction hash */
  destinationTxHash?: string;
  /** Block explorer URL for destination transaction */
  explorerUrl?: string;
  /** Order creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Estimated completion time */
  estimatedCompletionTime?: string;
  /** Failure reason if status is 'failed' */
  failureReason?: string;
}

// For backwards compatibility during migration
export type SwapResponse = ExecuteSwapResponse;

// ============================================================================
// Error Types
// ============================================================================

export type ErrorCode =
  | 'INSUFFICIENT_LIQUIDITY'
  | 'AMOUNT_TOO_LOW'
  | 'AMOUNT_TOO_HIGH'
  | 'UNSUPPORTED_PAIR'
  | 'QUOTE_EXPIRED'
  | 'INVALID_TOKEN_ADDRESS'
  | 'INVALID_CHAIN_ID'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'SERVER_CONFIGURATION_ERROR'
  | 'BRIDGE_API_ERROR'
  | 'PRICE_FEED_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'TOKEN_2022_FEE_ERROR'
  | 'UNKNOWN_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// SDK Configuration
// ============================================================================

export interface ClawSwapConfig {
  /**
   * Base URL for the ClawSwap API
   * @default "https://api.clawswap.dev"
   */
  baseUrl?: string;

  /**
   * Custom fetch implementation (e.g., x402-wrapped fetch)
   * @default global fetch
   */
  fetch?: typeof fetch;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30s)
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;
}

export interface WaitForSettlementOptions {
  /**
   * Maximum time to wait in milliseconds
   * @default 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Polling interval in milliseconds
   * @default 3000 (3s)
   */
  interval?: number;

  /**
   * Callback for status updates
   */
  onStatusUpdate?: (status: StatusResponse) => void;
}
