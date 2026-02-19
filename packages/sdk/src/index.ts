// Main exports
export { ClawSwapClient } from './client';

// Types
export type {
  ClawSwapConfig,
  QuoteRequest,
  QuoteResponse,
  ExecuteSwapResponse,
  SwapResponse, // Alias for ExecuteSwapResponse (backwards compatibility)
  StatusResponse,
  SwapFeeResponse,
  WaitForSettlementOptions,
  Chain,
  Token,
  TokenPair,
  SwapStatus,
  SwapTransaction,
  ErrorCode,
  ApiError,
} from './types';

// Errors
export {
  ClawSwapError,
  InsufficientLiquidityError,
  AmountTooLowError,
  AmountTooHighError,
  UnsupportedPairError,
  QuoteExpiredError,
  PaymentRequiredError,
  PaymentVerificationError,
  NetworkError,
  TimeoutError,
} from './errors';

// Schemas (for external validation if needed)
export { quoteRequestSchema, statusRequestSchema } from './schemas';
