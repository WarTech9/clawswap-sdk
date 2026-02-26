// Main exports
export { ClawSwapClient } from './client';

// Types
export type {
  ClawSwapConfig,
  QuoteRequest,
  QuoteResponse,
  ExecuteSwapResponse,
  EvmTransaction,
  StatusResponse,
  SwapFeeBreakdown,
  WaitForSettlementOptions,
  Chain,
  Token,
  TokenPair,
  SwapStatus,
  ErrorCode,
  ApiError,
} from './types';

// Type guards
export { isEvmSource, isSolanaSource } from './types';

// Errors
export {
  ClawSwapError,
  MissingFieldError,
  UnsupportedChainError,
  UnsupportedRouteError,
  QuoteFailedError,
  InsufficientLiquidityError,
  AmountTooLowError,
  AmountTooHighError,
  GasExceedsThresholdError,
  RelayUnavailableError,
  PaymentRequiredError,
  RateLimitExceededError,
  NetworkError,
  TimeoutError,
} from './errors';

// Schemas (for MCP tool input schemas, GOAT plugin validation)
export { quoteRequestSchema, statusRequestSchema } from './schemas';
