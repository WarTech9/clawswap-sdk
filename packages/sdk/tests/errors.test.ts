import { describe, it, expect } from 'vitest';
import {
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
  mapApiError,
} from '../src/errors';

describe('Error Classes', () => {
  describe('ClawSwapError', () => {
    it('should create base error with code and message', () => {
      const error = new ClawSwapError('NETWORK_ERROR', 'Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ClawSwapError');
    });

    it('should include suggestion', () => {
      const error = new ClawSwapError('AMOUNT_TOO_LOW', 'Amount too low', 'Try at least 1000 USDC');

      expect(error.suggestion).toBe('Try at least 1000 USDC');
    });

    it('should serialize to v2 JSON envelope', () => {
      const error = new ClawSwapError('TIMEOUT', 'Request timed out', 'Increase timeout');
      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out',
          suggestion: 'Increase timeout',
        },
      });
    });

    it('should omit suggestion when undefined', () => {
      const error = new ClawSwapError('TIMEOUT', 'Request timed out');
      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out',
        },
      });
    });
  });

  describe('Specific Error Classes', () => {
    it('should create MissingFieldError', () => {
      const error = new MissingFieldError();
      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('MISSING_FIELD');
      expect(error.name).toBe('MissingFieldError');
    });

    it('should create UnsupportedChainError', () => {
      const error = new UnsupportedChainError();
      expect(error.code).toBe('UNSUPPORTED_CHAIN');
      expect(error.name).toBe('UnsupportedChainError');
    });

    it('should create UnsupportedRouteError', () => {
      const error = new UnsupportedRouteError();
      expect(error.code).toBe('UNSUPPORTED_ROUTE');
      expect(error.name).toBe('UnsupportedRouteError');
    });

    it('should create QuoteFailedError', () => {
      const error = new QuoteFailedError();
      expect(error.code).toBe('QUOTE_FAILED');
      expect(error.name).toBe('QuoteFailedError');
    });

    it('should create InsufficientLiquidityError', () => {
      const error = new InsufficientLiquidityError();
      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('INSUFFICIENT_LIQUIDITY');
      expect(error.name).toBe('InsufficientLiquidityError');
      expect(error.message).toBe('Insufficient liquidity for this swap');
    });

    it('should create AmountTooLowError with custom message', () => {
      const error = new AmountTooLowError('Minimum is 1000 USDC');
      expect(error.code).toBe('AMOUNT_TOO_LOW');
      expect(error.message).toBe('Minimum is 1000 USDC');
    });

    it('should create AmountTooHighError', () => {
      const error = new AmountTooHighError();
      expect(error.code).toBe('AMOUNT_TOO_HIGH');
      expect(error.name).toBe('AmountTooHighError');
    });

    it('should create GasExceedsThresholdError', () => {
      const error = new GasExceedsThresholdError();
      expect(error.code).toBe('GAS_EXCEEDS_THRESHOLD');
      expect(error.name).toBe('GasExceedsThresholdError');
    });

    it('should create RelayUnavailableError', () => {
      const error = new RelayUnavailableError();
      expect(error.code).toBe('RELAY_UNAVAILABLE');
      expect(error.name).toBe('RelayUnavailableError');
    });

    it('should create PaymentRequiredError', () => {
      const error = new PaymentRequiredError();
      expect(error.code).toBe('PAYMENT_REQUIRED');
    });

    it('should create RateLimitExceededError', () => {
      const error = new RateLimitExceededError();
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.name).toBe('RateLimitExceededError');
    });

    it('should create NetworkError', () => {
      const error = new NetworkError();
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should create TimeoutError', () => {
      const error = new TimeoutError();
      expect(error.code).toBe('TIMEOUT');
    });
  });

  describe('mapApiError', () => {
    it('should map INSUFFICIENT_LIQUIDITY code', () => {
      const error = mapApiError(400, {
        error: { code: 'INSUFFICIENT_LIQUIDITY', message: 'Not enough liquidity' },
      });

      expect(error).toBeInstanceOf(InsufficientLiquidityError);
      expect(error.message).toBe('Not enough liquidity');
    });

    it('should map AMOUNT_TOO_LOW code', () => {
      const error = mapApiError(400, {
        error: { code: 'AMOUNT_TOO_LOW', message: 'Amount below minimum' },
      });

      expect(error).toBeInstanceOf(AmountTooLowError);
    });

    it('should map UNSUPPORTED_ROUTE code', () => {
      const error = mapApiError(400, {
        error: { code: 'UNSUPPORTED_ROUTE', message: 'Route not supported' },
      });

      expect(error).toBeInstanceOf(UnsupportedRouteError);
    });

    it('should map PAYMENT_REQUIRED code', () => {
      const error = mapApiError(402, {
        error: { code: 'PAYMENT_REQUIRED', message: 'Payment required' },
      });

      expect(error).toBeInstanceOf(PaymentRequiredError);
    });

    it('should map TIMEOUT code', () => {
      const error = mapApiError(408, {
        error: { code: 'TIMEOUT', message: 'Request timeout' },
      });

      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should map RATE_LIMIT_EXCEEDED code', () => {
      const error = mapApiError(429, {
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
      });

      expect(error).toBeInstanceOf(RateLimitExceededError);
    });

    it('should handle unknown error codes gracefully', () => {
      const error = mapApiError(400, {
        error: { code: 'SOME_NEW_CODE', message: 'Something new' },
      });

      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('SOME_NEW_CODE');
    });

    it('should fallback to 402 status code', () => {
      const error = mapApiError(402, {
        error: { message: 'Payment required' },
      });

      expect(error).toBeInstanceOf(PaymentRequiredError);
    });

    it('should fallback to 429 status code', () => {
      const error = mapApiError(429, {});

      expect(error).toBeInstanceOf(RateLimitExceededError);
    });

    it('should map 500+ status codes to RelayUnavailableError', () => {
      const error = mapApiError(500, {
        error: { message: 'Internal server error' },
      });

      expect(error).toBeInstanceOf(RelayUnavailableError);
      expect(error.code).toBe('RELAY_UNAVAILABLE');
    });

    it('should default to NETWORK_ERROR for unknown status', () => {
      const error = mapApiError(400, {});

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Unknown error occurred');
    });

    it('should preserve suggestion from error envelope', () => {
      const error = mapApiError(400, {
        error: {
          code: 'AMOUNT_TOO_LOW',
          message: 'Amount too low',
          suggestion: 'Try at least 1000 USDC',
        },
      });

      expect(error.suggestion).toBe('Try at least 1000 USDC');
    });

    it('should handle null errorData without throwing', () => {
      const error = mapApiError(500, null);
      expect(error).toBeInstanceOf(RelayUnavailableError);
    });

    it('should handle undefined errorData without throwing', () => {
      const error = mapApiError(400, undefined);
      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should map 404 status code to UNSUPPORTED_ROUTE', () => {
      const error = mapApiError(404, {
        error: { message: 'Not found' },
      });
      expect(error.code).toBe('UNSUPPORTED_ROUTE');
      expect(error.message).toBe('Not found');
    });

    it('should map 404 with no body to UNSUPPORTED_ROUTE', () => {
      const error = mapApiError(404, {});
      expect(error.code).toBe('UNSUPPORTED_ROUTE');
      expect(error.message).toBe('Resource not found');
    });
  });
});
