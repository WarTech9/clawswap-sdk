import { describe, it, expect } from 'vitest';
import {
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
  mapApiError,
} from '../src/errors';

describe('Error Classes', () => {
  describe('ClawSwapError', () => {
    it('should create base error with code and message', () => {
      const error = new ClawSwapError('UNKNOWN_ERROR', 'Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ClawSwapError');
    });

    it('should include details', () => {
      const details = { amount: '1000', minimum: '5000' };
      const error = new ClawSwapError('AMOUNT_TOO_LOW', 'Amount too low', details);

      expect(error.details).toEqual(details);
    });

    it('should serialize to JSON', () => {
      const error = new ClawSwapError('TIMEOUT', 'Request timed out', { timeoutMs: 30000 });
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'TIMEOUT',
        message: 'Request timed out',
        details: { timeoutMs: 30000 },
      });
    });
  });

  describe('Specific Error Classes', () => {
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

    it('should create UnsupportedPairError', () => {
      const error = new UnsupportedPairError();

      expect(error.code).toBe('UNSUPPORTED_PAIR');
    });

    it('should create QuoteExpiredError', () => {
      const error = new QuoteExpiredError();

      expect(error.code).toBe('QUOTE_EXPIRED');
      expect(error.message).toContain('expired');
    });

    it('should create PaymentRequiredError', () => {
      const error = new PaymentRequiredError();

      expect(error.code).toBe('PAYMENT_REQUIRED');
    });

    it('should create PaymentVerificationError', () => {
      const error = new PaymentVerificationError();

      expect(error.code).toBe('PAYMENT_VERIFICATION_FAILED');
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
        code: 'INSUFFICIENT_LIQUIDITY',
        message: 'Not enough liquidity',
      });

      expect(error).toBeInstanceOf(InsufficientLiquidityError);
      expect(error.message).toBe('Not enough liquidity');
    });

    it('should map AMOUNT_TOO_LOW code', () => {
      const error = mapApiError(400, {
        code: 'AMOUNT_TOO_LOW',
        message: 'Amount below minimum',
      });

      expect(error).toBeInstanceOf(AmountTooLowError);
    });

    it('should map QUOTE_EXPIRED code', () => {
      const error = mapApiError(400, {
        code: 'QUOTE_EXPIRED',
        message: 'Quote expired',
      });

      expect(error).toBeInstanceOf(QuoteExpiredError);
    });

    it('should map PAYMENT_REQUIRED code', () => {
      const error = mapApiError(402, {
        code: 'PAYMENT_REQUIRED',
        message: 'Payment required',
      });

      expect(error).toBeInstanceOf(PaymentRequiredError);
    });

    it('should map TIMEOUT code', () => {
      const error = mapApiError(408, {
        code: 'TIMEOUT',
        message: 'Request timeout',
      });

      expect(error).toBeInstanceOf(TimeoutError);
    });

    it('should handle unknown error codes', () => {
      const error = mapApiError(400, {
        code: 'INVALID_CHAIN_ID' as any,
        message: 'Invalid chain',
      });

      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('INVALID_CHAIN_ID');
    });

    it('should fallback to 402 status code', () => {
      const error = mapApiError(402, {
        message: 'Payment required',
      });

      expect(error).toBeInstanceOf(PaymentRequiredError);
    });

    it('should map 500+ status codes to SERVER_CONFIGURATION_ERROR', () => {
      const error = mapApiError(500, {
        message: 'Internal server error',
      });

      expect(error).toBeInstanceOf(ClawSwapError);
      expect(error.code).toBe('SERVER_CONFIGURATION_ERROR');
    });

    it('should default to UNKNOWN_ERROR', () => {
      const error = mapApiError(400, {});

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('Unknown error occurred');
    });

    it('should preserve error details', () => {
      const details = { minimumAmount: '1000', providedAmount: '500' };
      const error = mapApiError(400, {
        code: 'AMOUNT_TOO_LOW',
        message: 'Amount too low',
        details,
      });

      expect(error.details).toEqual(details);
    });
  });
});
