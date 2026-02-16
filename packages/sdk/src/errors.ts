import type { ErrorCode, ApiError } from './types';

/**
 * Base error class for all ClawSwap SDK errors
 */
export class ClawSwapError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ClawSwapError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ClawSwapError.prototype);
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Thrown when insufficient liquidity is available for the swap
 */
export class InsufficientLiquidityError extends ClawSwapError {
  constructor(message = 'Insufficient liquidity for this swap', details?: Record<string, unknown>) {
    super('INSUFFICIENT_LIQUIDITY', message, details);
    this.name = 'InsufficientLiquidityError';
    Object.setPrototypeOf(this, InsufficientLiquidityError.prototype);
  }
}

/**
 * Thrown when the swap amount is below minimum
 */
export class AmountTooLowError extends ClawSwapError {
  constructor(message = 'Amount is below minimum', details?: Record<string, unknown>) {
    super('AMOUNT_TOO_LOW', message, details);
    this.name = 'AmountTooLowError';
    Object.setPrototypeOf(this, AmountTooLowError.prototype);
  }
}

/**
 * Thrown when the swap amount exceeds maximum
 */
export class AmountTooHighError extends ClawSwapError {
  constructor(message = 'Amount exceeds maximum', details?: Record<string, unknown>) {
    super('AMOUNT_TOO_HIGH', message, details);
    this.name = 'AmountTooHighError';
    Object.setPrototypeOf(this, AmountTooHighError.prototype);
  }
}

/**
 * Thrown when the token pair is not supported
 */
export class UnsupportedPairError extends ClawSwapError {
  constructor(message = 'This token pair is not supported', details?: Record<string, unknown>) {
    super('UNSUPPORTED_PAIR', message, details);
    this.name = 'UnsupportedPairError';
    Object.setPrototypeOf(this, UnsupportedPairError.prototype);
  }
}

/**
 * Thrown when a quote has expired (30s TTL)
 */
export class QuoteExpiredError extends ClawSwapError {
  constructor(
    message = 'Quote has expired, please request a new quote',
    details?: Record<string, unknown>
  ) {
    super('QUOTE_EXPIRED', message, details);
    this.name = 'QuoteExpiredError';
    Object.setPrototypeOf(this, QuoteExpiredError.prototype);
  }
}

/**
 * Thrown when payment is required but not provided
 */
export class PaymentRequiredError extends ClawSwapError {
  constructor(message = 'Payment required to execute swap', details?: Record<string, unknown>) {
    super('PAYMENT_REQUIRED', message, details);
    this.name = 'PaymentRequiredError';
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

/**
 * Thrown when payment verification fails
 */
export class PaymentVerificationError extends ClawSwapError {
  constructor(message = 'Payment verification failed', details?: Record<string, unknown>) {
    super('PAYMENT_VERIFICATION_FAILED', message, details);
    this.name = 'PaymentVerificationError';
    Object.setPrototypeOf(this, PaymentVerificationError.prototype);
  }
}

/**
 * Thrown when network request fails
 */
export class NetworkError extends ClawSwapError {
  constructor(message = 'Network request failed', details?: Record<string, unknown>) {
    super('NETWORK_ERROR', message, details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Thrown when request times out
 */
export class TimeoutError extends ClawSwapError {
  constructor(message = 'Request timed out', details?: Record<string, unknown>) {
    super('TIMEOUT', message, details);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Maps HTTP error responses to typed error classes
 */
export function mapApiError(statusCode: number, errorData: Partial<ApiError>): ClawSwapError {
  const { code, message, details } = errorData;

  // If we have a specific error code, use it
  if (code) {
    switch (code) {
      case 'INSUFFICIENT_LIQUIDITY':
        return new InsufficientLiquidityError(message, details);
      case 'AMOUNT_TOO_LOW':
        return new AmountTooLowError(message, details);
      case 'AMOUNT_TOO_HIGH':
        return new AmountTooHighError(message, details);
      case 'UNSUPPORTED_PAIR':
        return new UnsupportedPairError(message, details);
      case 'QUOTE_EXPIRED':
        return new QuoteExpiredError(message, details);
      case 'PAYMENT_REQUIRED':
        return new PaymentRequiredError(message, details);
      case 'PAYMENT_VERIFICATION_FAILED':
        return new PaymentVerificationError(message, details);
      case 'NETWORK_ERROR':
        return new NetworkError(message, details);
      case 'TIMEOUT':
        return new TimeoutError(message, details);
      default:
        return new ClawSwapError(code, message || 'An error occurred', details);
    }
  }

  // Fallback to HTTP status code mapping
  if (statusCode === 402) {
    return new PaymentRequiredError(message || 'Payment required', details);
  }

  if (statusCode >= 500) {
    return new ClawSwapError(
      'SERVER_CONFIGURATION_ERROR',
      message || 'Server error occurred',
      details
    );
  }

  return new ClawSwapError('UNKNOWN_ERROR', message || 'Unknown error occurred', details);
}
