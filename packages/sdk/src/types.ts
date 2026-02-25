/**
 * Core types for ClawSwap SDK v2
 * Aligned with the v2 API at api.clawswap.dev
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

export interface SwapFeeBreakdown {
  x402Fee: {
    amountUsd: number;
    currency: string;
    network: string;
    appliesTo: string;
    description: string;
  };
  gasReimbursement: null | Record<string, unknown>;
  bridgeFee: {
    estimatedUsd: string;
    currency: string;
    appliesTo: string;
    description: string;
  };
  note: string;
}

// ============================================================================
// Request Types
// ============================================================================

export interface QuoteRequest {
  sourceChain: string;
  sourceToken: string;
  destinationChain: string;
  destinationToken: string;
  amount: string;
  userWallet: string;
  recipient: string;
  slippageTolerance?: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface QuoteResponse {
  estimatedOutput: string;
  estimatedOutputFormatted: string;
  estimatedTime: number;
  fees: {
    clawswap: string;
    relay: string;
    gas: string;
  };
  route: {
    sourceChain: string;
    sourceToken: { symbol: string; address: string; decimals: number };
    destinationChain: string;
    destinationToken: { symbol: string; address: string; decimals: number };
  };
  supported: boolean;
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
  /** Optional gas limit hint */
  gas?: string;
}

/**
 * Response from POST /api/swap/execute
 * Returns transaction(s) that the user must sign and submit.
 *
 * - Solana source: `transaction` is a base64-encoded partially-signed Solana transaction
 * - EVM source: `transactions` is an ordered array of EVM transactions to execute sequentially
 */
export interface ExecuteSwapResponse {
  /** Request ID for tracking swap status via /api/swap/:id/status */
  requestId: string;
  /** Base64-encoded partially-signed Solana transaction (Solana source only) */
  transaction?: string;
  /** Ordered array of EVM transactions to execute sequentially (EVM source only) */
  transactions?: EvmTransaction[];
  /** Source chain identifier */
  sourceChain: string;
  /** Estimated output amount in smallest units */
  estimatedOutput: string;
  /** Estimated settlement time in seconds */
  estimatedTime: number;
  /** Fee breakdown */
  fees: {
    clawswap: string;
    relay: string;
    gas: string;
  };
  /** Human-readable instructions for signing and submitting */
  instructions: string;
}

/** Check if the execute response is from a Solana source swap */
export function isSolanaSource(
  response: ExecuteSwapResponse
): response is ExecuteSwapResponse & { transaction: string } {
  return typeof response.transaction === 'string' && !Array.isArray(response.transactions);
}

/** Check if the execute response is from an EVM source swap */
export function isEvmSource(
  response: ExecuteSwapResponse
): response is ExecuteSwapResponse & { transactions: EvmTransaction[] } {
  return Array.isArray(response.transactions) && typeof response.transaction !== 'string';
}

/**
 * Swap status values from the v2 API
 */
export type SwapStatus =
  | 'pending'
  | 'submitted'
  | 'filling'
  | 'completed'
  | 'failed';

/**
 * Response from GET /api/swap/:id/status
 */
export interface StatusResponse {
  /** Request ID */
  requestId: string;
  /** Current swap status */
  status: SwapStatus;
  /** Source chain identifier */
  sourceChain: string;
  /** Destination chain identifier */
  destinationChain: string;
  /** Output amount in smallest units */
  outputAmount: string;
  /** Source chain transaction hash */
  sourceTxHash?: string;
  /** Destination chain transaction hash */
  destinationTxHash?: string;
  /** Completion timestamp (ISO 8601) */
  completedAt?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export type ErrorCode =
  | 'MISSING_FIELD'
  | 'UNSUPPORTED_CHAIN'
  | 'UNSUPPORTED_ROUTE'
  | 'QUOTE_FAILED'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'AMOUNT_TOO_LOW'
  | 'AMOUNT_TOO_HIGH'
  | 'GAS_EXCEEDS_THRESHOLD'
  | 'RELAY_UNAVAILABLE'
  | 'PAYMENT_REQUIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    suggestion?: string;
  };
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
