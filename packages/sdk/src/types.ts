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

export interface SwapFeeBreakdown {
  x402Fee: {
    amountUsd: number;
    currency: string;
    network: string;
    appliesTo: string;
    description: string;
  };
  gasReimbursement: {
    estimatedUsd: string;
    currency: string;
    appliesTo: string;
    description: string;
  };
  bridgeFee: {
    estimatedUsd: string;
    currency: string;
    appliesTo: string;
    description: string;
  };
  note: string;
}

/** @deprecated Use SwapFeeBreakdown */
export type SwapFeeResponse = SwapFeeBreakdown;

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: string;
  logoUri?: string;
  isToken2022?: boolean;
  transferFeePercent?: number | null;
  transferFeeBasisPoints?: number | null;
  maximumFee?: string | null;
  requiresMemoTransfers?: boolean;
}

export interface TokenPair {
  sourceChain: Chain;
  sourceToken: Token;
  destinationChain: Chain;
  destinationToken: Token;
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
  orderId: string;
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

/** EVM transaction object returned for Base → Solana swaps */
export interface EvmTransaction {
  /** Contract address to call (Relay's contract on Base) */
  to: string;
  /** Hex-encoded calldata */
  data: string;
  /** Native token value in wei (usually "0" for token swaps) */
  value: string;
  /** EVM chain ID (8453 for Base) */
  chainId: number;
  /** Human-readable step description (e.g. "Approve USDC spending") */
  description?: string;
}

/**
 * Response from POST /api/swap/execute
 * Returns transaction(s) that the user must sign and submit.
 *
 * - Solana source: `transaction` is a base64-encoded partially-signed Solana transaction
 * - EVM source: `transactions` is an ordered array of EVM transactions to execute sequentially
 */
export interface ExecuteSwapResponse {
  /** Base64-encoded partially-signed Solana transaction (Solana source only) */
  transaction?: string;
  /** Ordered array of EVM transactions to execute sequentially (EVM source only) */
  transactions?: EvmTransaction[];
  /** Order ID for tracking swap status via /api/swap/:id/status */
  orderId: string;
  /** Whether the source token is Token-2022 (always false for EVM source) */
  isToken2022: boolean;
  /** Detailed fee and amount accounting */
  accounting: {
    x402Fee: {
      amountUsd: number;
      currency: string;
      recipient: string;
      note: string;
    };
    /** Gas reimbursement details. null for EVM-source swaps (no gas sponsorship). */
    gasReimbursement: {
      amountRaw: string;
      amountFormatted: string;
      tokenMint: string;
      recipient: string;
      note: string;
    } | null;
    bridgeFee: {
      estimatedUsd: number;
      note: string;
    };
    sourceAmount: string;
    destinationAmount: string;
  };
}

/** Check if the execute response is from a Solana source swap */
export function isSolanaSource(response: ExecuteSwapResponse): boolean {
  return typeof response.transaction === 'string';
}

/** Check if the execute response is from an EVM source swap */
export function isEvmSource(response: ExecuteSwapResponse): boolean {
  return Array.isArray(response.transactions);
}

/**
 * @deprecated Use `isEvmSource(response)` instead. The API now returns
 * `transactions` (array) for EVM source, not a single `transaction` object.
 */
export function isEvmTransaction(
  tx: unknown
): tx is EvmTransaction {
  return typeof tx === 'object' && tx !== null && 'to' in tx;
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
  | 'INVALID_MINT_ADDRESS'
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
