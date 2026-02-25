import type { ErrorCode, ApiError } from './types';

/**
 * Base error class for all ClawSwap SDK errors (v2)
 */
export class ClawSwapError extends Error {
  public readonly code: ErrorCode;
  public readonly suggestion?: string;

  constructor(code: ErrorCode, message: string, suggestion?: string) {
    super(message);
    this.name = 'ClawSwapError';
    this.code = code;
    this.suggestion = suggestion;
    Object.setPrototypeOf(this, ClawSwapError.prototype);
  }

  toJSON(): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.suggestion && { suggestion: this.suggestion }),
      },
    };
  }
}

export class MissingFieldError extends ClawSwapError {
  constructor(message = 'Missing required field', suggestion?: string) {
    super('MISSING_FIELD', message, suggestion);
    this.name = 'MissingFieldError';
    Object.setPrototypeOf(this, MissingFieldError.prototype);
  }
}

export class UnsupportedChainError extends ClawSwapError {
  constructor(message = 'Chain not supported', suggestion?: string) {
    super('UNSUPPORTED_CHAIN', message, suggestion);
    this.name = 'UnsupportedChainError';
    Object.setPrototypeOf(this, UnsupportedChainError.prototype);
  }
}

export class UnsupportedRouteError extends ClawSwapError {
  constructor(message = 'This route is not supported', suggestion?: string) {
    super('UNSUPPORTED_ROUTE', message, suggestion);
    this.name = 'UnsupportedRouteError';
    Object.setPrototypeOf(this, UnsupportedRouteError.prototype);
  }
}

export class QuoteFailedError extends ClawSwapError {
  constructor(message = 'Failed to get quote', suggestion?: string) {
    super('QUOTE_FAILED', message, suggestion);
    this.name = 'QuoteFailedError';
    Object.setPrototypeOf(this, QuoteFailedError.prototype);
  }
}

export class InsufficientLiquidityError extends ClawSwapError {
  constructor(message = 'Insufficient liquidity for this swap', suggestion?: string) {
    super('INSUFFICIENT_LIQUIDITY', message, suggestion);
    this.name = 'InsufficientLiquidityError';
    Object.setPrototypeOf(this, InsufficientLiquidityError.prototype);
  }
}

export class AmountTooLowError extends ClawSwapError {
  constructor(message = 'Amount is below minimum', suggestion?: string) {
    super('AMOUNT_TOO_LOW', message, suggestion);
    this.name = 'AmountTooLowError';
    Object.setPrototypeOf(this, AmountTooLowError.prototype);
  }
}

export class AmountTooHighError extends ClawSwapError {
  constructor(message = 'Amount exceeds maximum', suggestion?: string) {
    super('AMOUNT_TOO_HIGH', message, suggestion);
    this.name = 'AmountTooHighError';
    Object.setPrototypeOf(this, AmountTooHighError.prototype);
  }
}

export class GasExceedsThresholdError extends ClawSwapError {
  constructor(message = 'Gas cost exceeds safety threshold', suggestion?: string) {
    super('GAS_EXCEEDS_THRESHOLD', message, suggestion);
    this.name = 'GasExceedsThresholdError';
    Object.setPrototypeOf(this, GasExceedsThresholdError.prototype);
  }
}

export class RelayUnavailableError extends ClawSwapError {
  constructor(message = 'Relay bridge service unavailable', suggestion?: string) {
    super('RELAY_UNAVAILABLE', message, suggestion);
    this.name = 'RelayUnavailableError';
    Object.setPrototypeOf(this, RelayUnavailableError.prototype);
  }
}

export class PaymentRequiredError extends ClawSwapError {
  constructor(message = 'Payment required to execute swap', suggestion?: string) {
    super('PAYMENT_REQUIRED', message, suggestion);
    this.name = 'PaymentRequiredError';
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

export class RateLimitExceededError extends ClawSwapError {
  constructor(message = 'Rate limit exceeded', suggestion?: string) {
    super('RATE_LIMIT_EXCEEDED', message, suggestion);
    this.name = 'RateLimitExceededError';
    Object.setPrototypeOf(this, RateLimitExceededError.prototype);
  }
}

export class NetworkError extends ClawSwapError {
  constructor(message = 'Network request failed', suggestion?: string) {
    super('NETWORK_ERROR', message, suggestion);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class TimeoutError extends ClawSwapError {
  constructor(message = 'Request timed out', suggestion?: string) {
    super('TIMEOUT', message, suggestion);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Maps HTTP error responses to typed error classes.
 * Parses the v2 error envelope: { error: { code, message, suggestion } }
 */
export function mapApiError(statusCode: number, errorData: unknown): ClawSwapError {
  const envelope = (errorData != null && typeof errorData === 'object' ? errorData : {}) as {
    error?: { code?: string; message?: string; suggestion?: string };
  };
  const code = envelope?.error?.code;
  const message = envelope?.error?.message;
  const suggestion = envelope?.error?.suggestion;

  if (code) {
    switch (code) {
      case 'MISSING_FIELD':
        return new MissingFieldError(message, suggestion);
      case 'UNSUPPORTED_CHAIN':
        return new UnsupportedChainError(message, suggestion);
      case 'UNSUPPORTED_ROUTE':
        return new UnsupportedRouteError(message, suggestion);
      case 'QUOTE_FAILED':
        return new QuoteFailedError(message, suggestion);
      case 'INSUFFICIENT_LIQUIDITY':
        return new InsufficientLiquidityError(message, suggestion);
      case 'AMOUNT_TOO_LOW':
        return new AmountTooLowError(message, suggestion);
      case 'AMOUNT_TOO_HIGH':
        return new AmountTooHighError(message, suggestion);
      case 'GAS_EXCEEDS_THRESHOLD':
        return new GasExceedsThresholdError(message, suggestion);
      case 'RELAY_UNAVAILABLE':
        return new RelayUnavailableError(message, suggestion);
      case 'PAYMENT_REQUIRED':
        return new PaymentRequiredError(message, suggestion);
      case 'RATE_LIMIT_EXCEEDED':
        return new RateLimitExceededError(message, suggestion);
      case 'NETWORK_ERROR':
        return new NetworkError(message, suggestion);
      case 'TIMEOUT':
        return new TimeoutError(message, suggestion);
      default:
        return new ClawSwapError(code as ErrorCode, message || 'An error occurred', suggestion);
    }
  }

  // Fallback: HTTP status code mapping
  if (statusCode === 402) {
    return new PaymentRequiredError(message || 'Payment required', suggestion);
  }
  if (statusCode === 404) {
    return new ClawSwapError('UNSUPPORTED_ROUTE' as ErrorCode, message || 'Resource not found', suggestion);
  }
  if (statusCode === 429) {
    return new RateLimitExceededError(message || 'Rate limit exceeded', suggestion);
  }
  if (statusCode >= 500) {
    return new RelayUnavailableError(message || 'Server error occurred', suggestion);
  }

  return new ClawSwapError('NETWORK_ERROR' as ErrorCode, message || 'Unknown error occurred', suggestion);
}
