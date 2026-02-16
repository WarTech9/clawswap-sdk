import { describe, it, expect } from 'vitest';
import {
  quoteRequestSchema,
  statusRequestSchema,
  chainIdSchema,
  tokenAddressSchema,
  amountSchema,
} from '../src/schemas';

describe('Validation Schemas', () => {
  describe('chainIdSchema', () => {
    it('should validate valid chain IDs', () => {
      expect(chainIdSchema.parse('solana')).toBe('solana');
      expect(chainIdSchema.parse('base')).toBe('base');
    });

    it('should reject empty chain ID', () => {
      expect(() => chainIdSchema.parse('')).toThrow('Chain ID is required');
    });
  });

  describe('tokenAddressSchema', () => {
    it('should validate token addresses', () => {
      expect(tokenAddressSchema.parse('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
      expect(tokenAddressSchema.parse('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      );
    });

    it('should reject empty address', () => {
      expect(() => tokenAddressSchema.parse('')).toThrow('Token address is required');
    });
  });

  describe('amountSchema', () => {
    it('should validate positive numbers as strings', () => {
      expect(amountSchema.parse('1000000')).toBe('1000000');
      expect(amountSchema.parse('0.5')).toBe('0.5');
      expect(amountSchema.parse('999999999')).toBe('999999999');
    });

    it('should reject negative numbers', () => {
      expect(() => amountSchema.parse('-100')).toThrow('Amount must be a positive number');
    });

    it('should reject zero', () => {
      expect(() => amountSchema.parse('0')).toThrow('Amount must be a positive number');
    });

    it('should reject non-numeric strings', () => {
      expect(() => amountSchema.parse('abc')).toThrow('Amount must be a positive number');
      expect(() => amountSchema.parse('')).toThrow('Amount must be a positive number');
    });
  });

  describe('quoteRequestSchema', () => {
    const validQuoteRequest = {
      sourceChainId: 'solana',
      sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationChainId: 'base',
      destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '1000000',
      senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
      recipientAddress: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
    };

    it('should validate complete quote request', () => {
      const result = quoteRequestSchema.parse(validQuoteRequest);
      expect(result).toEqual(validQuoteRequest);
    });

    it('should reject missing sourceChainId', () => {
      const { sourceChainId, ...incomplete } = validQuoteRequest;
      expect(() => quoteRequestSchema.parse(incomplete)).toThrow();
    });

    it('should reject missing sourceTokenAddress', () => {
      const { sourceTokenAddress, ...incomplete } = validQuoteRequest;
      expect(() => quoteRequestSchema.parse(incomplete)).toThrow();
    });

    it('should reject missing destinationChainId', () => {
      const { destinationChainId, ...incomplete } = validQuoteRequest;
      expect(() => quoteRequestSchema.parse(incomplete)).toThrow();
    });

    it('should reject missing destinationTokenAddress', () => {
      const { destinationTokenAddress, ...incomplete } = validQuoteRequest;
      expect(() => quoteRequestSchema.parse(incomplete)).toThrow();
    });

    it('should reject missing amount', () => {
      const { amount, ...incomplete } = validQuoteRequest;
      expect(() => quoteRequestSchema.parse(incomplete)).toThrow();
    });

    it('should reject empty strings', () => {
      expect(() =>
        quoteRequestSchema.parse({
          ...validQuoteRequest,
          sourceChainId: '',
        })
      ).toThrow();
    });
  });

  describe('statusRequestSchema', () => {
    it('should validate swap ID', () => {
      const result = statusRequestSchema.parse({ swapId: 'swap-123' });
      expect(result.swapId).toBe('swap-123');
    });

    it('should reject empty swap ID', () => {
      expect(() => statusRequestSchema.parse({ swapId: '' })).toThrow();
    });

    it('should reject missing swap ID', () => {
      expect(() => statusRequestSchema.parse({})).toThrow();
    });
  });
});
