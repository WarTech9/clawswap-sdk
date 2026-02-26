import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClawSwapClient } from '../src/client';
import type { QuoteResponse, StatusResponse, Chain, Token, EvmTransaction, ExecuteSwapResponse } from '../src/types';
import { isEvmSource, isSolanaSource } from '../src/types';
import {
  ClawSwapError,
  InsufficientLiquidityError,
  NetworkError,
  PaymentRequiredError,
  TimeoutError,
  UnsupportedChainError,
} from '../src/errors';

describe('ClawSwapClient', () => {
  let client: ClawSwapClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new ClawSwapClient({
      fetch: mockFetch as any,
      baseUrl: 'https://api.test.clawswap.dev',
      timeout: 5000,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuote', () => {
    const validQuoteRequest = {
      sourceChain: 'solana',
      sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationChain: 'base',
      destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '1000000',
      userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
      recipient: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
    };

    it('should return quote response successfully', async () => {
      const mockQuote: QuoteResponse = {
        estimatedOutput: '999000',
        estimatedOutputFormatted: '0.999',
        estimatedTime: 300,
        fees: {
          clawswap: '0.25',
          relay: '0.03',
          gas: '0.00 (sponsored)',
        },
        route: {
          sourceChain: 'solana',
          sourceToken: { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
          destinationChain: 'base',
          destinationToken: { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
        },
        supported: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuote,
      });

      const result = await client.getQuote(validQuoteRequest);

      expect(result).toEqual(mockQuote);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/swap/quote',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(validQuoteRequest),
        })
      );
    });

    it('should validate input parameters', async () => {
      await expect(
        client.getQuote({
          sourceChain: '',
          sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          destinationChain: 'base',
          destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          amount: '1000000',
        } as any)
      ).rejects.toThrow();
    });

    it('should validate amount is positive', async () => {
      await expect(
        client.getQuote({
          ...validQuoteRequest,
          amount: '-100',
        })
      ).rejects.toThrow();
    });

    it('should throw InsufficientLiquidityError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 'INSUFFICIENT_LIQUIDITY', message: 'Not enough liquidity' },
        }),
      });

      await expect(client.getQuote(validQuoteRequest)).rejects.toThrow(
        InsufficientLiquidityError
      );
    });
  });

  describe('executeSwap', () => {
    const validExecuteRequest = {
      sourceChain: 'solana',
      sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationChain: 'base',
      destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '1000000',
      userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
      recipient: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
    };

    it('should execute swap successfully', async () => {
      const mockExecuteResponse: ExecuteSwapResponse = {
        requestId: 'req-123',
        transaction: 'base64-encoded-transaction-data',
        sourceChain: 'solana',
        estimatedOutput: '999000',
        estimatedTime: 300,
        fees: {
          clawswap: '0.25',
          relay: '0.03',
          gas: '0.00 (sponsored)',
        },
        instructions: 'Sign and submit to Solana RPC',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExecuteResponse,
      });

      const result = await client.executeSwap(validExecuteRequest);

      expect(result).toEqual(mockExecuteResponse);
      expect(result.requestId).toBe('req-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/swap/execute',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw PaymentRequiredError on 402', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({
          error: { code: 'PAYMENT_REQUIRED', message: 'Payment required' },
        }),
      });

      await expect(client.executeSwap(validExecuteRequest)).rejects.toThrow(PaymentRequiredError);
    });

    it('should require userWallet', async () => {
      await expect(
        client.executeSwap({
          ...validExecuteRequest,
          userWallet: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return swap status', async () => {
      const mockStatus: StatusResponse = {
        requestId: 'req-123',
        status: 'completed',
        sourceChain: 'solana',
        destinationChain: 'base',
        outputAmount: '999000',
        sourceTxHash: '5J7Qstq6afbmW9mAW4GvKBZkLXhJ9J1UmZJpZEhcZcZz',
        destinationTxHash: '0xabc123def456',
        completedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await client.getStatus('req-123');

      expect(result).toEqual(mockStatus);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/swap/req-123/status',
        expect.any(Object)
      );
    });
  });

  describe('waitForSettlement', () => {
    it('should poll until completed', async () => {
      const mockStatuses: StatusResponse[] = [
        {
          requestId: 'req-123',
          status: 'pending',
          sourceChain: 'solana',
          destinationChain: 'base',
          outputAmount: '999000',
        },
        {
          requestId: 'req-123',
          status: 'submitted',
          sourceChain: 'solana',
          destinationChain: 'base',
          outputAmount: '999000',
        },
        {
          requestId: 'req-123',
          status: 'completed',
          sourceChain: 'solana',
          destinationChain: 'base',
          outputAmount: '999000',
          sourceTxHash: '5J7Qstq6afbmW9mAW4GvKBZkLXhJ9J1UmZJpZEhcZcZz',
          destinationTxHash: '0xabc123def456',
          completedAt: new Date().toISOString(),
        },
      ];

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        const status = mockStatuses[callCount++];
        return Promise.resolve({
          ok: true,
          json: async () => status,
        });
      });

      const result = await client.waitForSettlement('req-123', {
        interval: 10, // Fast polling for tests
      });

      expect(result.status).toBe('completed');
      expect(callCount).toBe(3);
    });

    it('should timeout if swap takes too long', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          requestId: 'req-123',
          status: 'pending',
          sourceChain: 'solana',
          destinationChain: 'base',
          outputAmount: '999000',
        }),
      });

      await expect(
        client.waitForSettlement('req-123', {
          timeout: 100,
          interval: 10,
        })
      ).rejects.toThrow(TimeoutError);
    });

    it('should call onStatusUpdate callback', async () => {
      const onStatusUpdate = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requestId: 'req-123',
            status: 'pending',
            sourceChain: 'solana',
            destinationChain: 'base',
            outputAmount: '999000',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            requestId: 'req-123',
            status: 'completed',
            sourceChain: 'solana',
            destinationChain: 'base',
            outputAmount: '999000',
            completedAt: new Date().toISOString(),
          }),
        });

      await client.waitForSettlement('req-123', {
        interval: 10,
        onStatusUpdate,
      });

      expect(onStatusUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSupportedChains', () => {
    it('should return list of chains', async () => {
      const mockChains: Chain[] = [
        {
          id: 'solana',
          name: 'Solana',
          nativeCurrency: { symbol: 'SOL', decimals: 9 },
        },
        {
          id: 'base',
          name: 'Base',
          nativeCurrency: { symbol: 'ETH', decimals: 18 },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chains: mockChains }),
      });

      const result = await client.getSupportedChains();

      expect(result).toEqual(mockChains);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/chains',
        expect.any(Object)
      );
    });

    it('should throw NetworkError on malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'wrong shape' }),
      });

      await expect(client.getSupportedChains()).rejects.toThrow(NetworkError);
    });
  });

  describe('getSupportedTokens', () => {
    it('should return list of tokens for a chain', async () => {
      const mockTokens: Token[] = [
        {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 'solana',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tokens: mockTokens }),
      });

      const result = await client.getSupportedTokens('solana');

      expect(result).toEqual(mockTokens);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/tokens/solana',
        expect.any(Object)
      );
    });

    it('should reject path traversal in chainId', async () => {
      await expect(client.getSupportedTokens('../admin')).rejects.toThrow(UnsupportedChainError);
      await expect(client.getSupportedTokens('solana/../admin')).rejects.toThrow(UnsupportedChainError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw NetworkError on malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'wrong shape' }),
      });

      await expect(client.getSupportedTokens('solana')).rejects.toThrow(NetworkError);
    });
  });

  describe('timeout handling', () => {
    it('should throw TimeoutError on AbortError', async () => {
      mockFetch.mockImplementation(() => {
        const error = new DOMException('The operation was aborted', 'AbortError');
        return Promise.reject(error);
      });

      await expect(client.getQuote({
        sourceChain: 'solana',
        sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        destinationChain: 'base',
        destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1000000',
        userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipient: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
      })).rejects.toThrow(TimeoutError);
    });

    it('should throw NetworkError for generic fetch failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(client.getQuote({
        sourceChain: 'solana',
        sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        destinationChain: 'base',
        destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1000000',
        userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipient: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
      })).rejects.toThrow(NetworkError);
    });
  });

  describe('getSwapFee', () => {
    it('should return fee breakdown response', async () => {
      const mockFee = {
        x402Fee: {
          amountUsd: 0.5,
          currency: 'USDC',
          network: 'solana',
          appliesTo: 'Solana-source swaps only',
          description: 'Fixed fee charged via x402 protocol.',
        },
        gasReimbursement: null,
        bridgeFee: {
          estimatedUsd: '~0.03–0.05',
          currency: 'Source token',
          appliesTo: 'All swaps',
          description: 'Relay bridge fee',
        },
        note: 'Solana-source: total cost = x402Fee + bridgeFee. EVM-source: total cost = bridgeFee + gas.',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFee,
      });

      const result = await client.getSwapFee();

      expect(result).toEqual(mockFee);
      expect(result.x402Fee.amountUsd).toBe(0.5);
      expect(result.gasReimbursement).toBeNull();
      expect(result.bridgeFee.estimatedUsd).toBe('~0.03–0.05');
      expect(typeof result.note).toBe('string');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/swap/fee',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should propagate network errors as NetworkError', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.getSwapFee()).rejects.toThrow(NetworkError);
    });
  });

  describe('executeSwap (Base → Solana)', () => {
    const baseToSolanaRequest = {
      sourceChain: 'base',
      sourceToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      destinationChain: 'solana',
      destinationToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '1000000',
      userWallet: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      recipient: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
    };

    it('should handle transactions array in response', async () => {
      const mockResponse: ExecuteSwapResponse = {
        requestId: 'req-base-123',
        transactions: [
          {
            to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            data: '0xapprove1234567890',
            value: '0',
            chainId: 8453,
            description: 'Approve USDC spending',
          },
          {
            to: '0xa5F565650890Fba1824Ee0F21EbBbF660a179934',
            data: '0xabcdef1234567890',
            value: '0',
            chainId: 8453,
            description: 'Bridge deposit',
          },
        ],
        sourceChain: 'base',
        estimatedOutput: '962766',
        estimatedTime: 300,
        fees: {
          clawswap: '0',
          relay: '0.037',
          gas: 'paid by agent',
        },
        instructions: 'Sign and submit each transaction sequentially on Base',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.executeSwap(baseToSolanaRequest);

      expect(Array.isArray(result.transactions)).toBe(true);
      expect(result.transactions!.length).toBe(2);
      expect(result.transactions![0].description).toBe('Approve USDC spending');
      expect(result.transactions![1].to).toBe('0xa5F565650890Fba1824Ee0F21EbBbF660a179934');
      expect(result.transactions![1].chainId).toBe(8453);
      expect(result.fees.clawswap).toBe('0');
      expect(result.requestId).toBe('req-base-123');
    });

    it('should not require x402 payment for Base-source swaps', async () => {
      const mockResponse: ExecuteSwapResponse = {
        requestId: 'req-base-456',
        transactions: [
          { to: '0xabc', data: '0x123', value: '0', chainId: 8453 },
        ],
        sourceChain: 'base',
        estimatedOutput: '962766',
        estimatedTime: 300,
        fees: {
          clawswap: '0',
          relay: '0.037',
          gas: 'paid by agent',
        },
        instructions: 'Sign and submit on Base',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.executeSwap(baseToSolanaRequest);

      // Verify no 402 error was thrown (no x402 payment needed)
      expect(result.requestId).toBe('req-base-456');
      expect(result.fees.clawswap).toBe('0');
    });
  });

  describe('isEvmSource / isSolanaSource', () => {
    it('should identify EVM source responses (transactions array)', () => {
      const evmResponse: ExecuteSwapResponse = {
        requestId: 'req-123',
        transactions: [
          { to: '0xabc', data: '0x123', value: '0', chainId: 8453 },
        ],
        sourceChain: 'base',
        estimatedOutput: '962766',
        estimatedTime: 300,
        fees: { clawswap: '0', relay: '0.037', gas: 'paid by agent' },
        instructions: 'Sign and submit on Base',
      };
      expect(isEvmSource(evmResponse)).toBe(true);
      expect(isSolanaSource(evmResponse)).toBe(false);
    });

    it('should identify Solana source responses (transaction string)', () => {
      const solanaResponse: ExecuteSwapResponse = {
        requestId: 'req-456',
        transaction: 'AQAAAAAAAAAAAAAAAACAAQAHDw...',
        sourceChain: 'solana',
        estimatedOutput: '999000',
        estimatedTime: 300,
        fees: { clawswap: '0.25', relay: '0.03', gas: '0.00 (sponsored)' },
        instructions: 'Sign and submit to Solana RPC',
      };
      expect(isSolanaSource(solanaResponse)).toBe(true);
      expect(isEvmSource(solanaResponse)).toBe(false);
    });

    it('should return false for both guards when both fields are present', () => {
      const ambiguousResponse: ExecuteSwapResponse = {
        requestId: 'req-789',
        transaction: 'base64-data',
        transactions: [{ to: '0xabc', data: '0x123', value: '0', chainId: 8453 }],
        sourceChain: 'solana',
        estimatedOutput: '999000',
        estimatedTime: 300,
        fees: { clawswap: '0.25', relay: '0.03', gas: '0.00' },
        instructions: 'Ambiguous',
      };
      expect(isSolanaSource(ambiguousResponse)).toBe(false);
      expect(isEvmSource(ambiguousResponse)).toBe(false);
    });
  });

  describe('getSupportedPairs', () => {
    it('should return all valid cross-chain pairs with deduplicated token fetches', async () => {
      // Mock chains response
      const mockChains = {
        chains: [
          { id: 'solana', name: 'Solana', nativeCurrency: { symbol: 'SOL', decimals: 9 } },
          { id: 'base', name: 'Base', nativeCurrency: { symbol: 'ETH', decimals: 18 } },
        ],
      };

      // Mock tokens responses
      const mockSolanaTokens = {
        tokens: [
          { address: 'USDC_SOL', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 'solana' },
        ],
      };

      const mockBaseTokens = {
        tokens: [
          { address: '0xUSDC_BASE', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 'base' },
        ],
      };

      // With Promise.all optimization: 1 chains call + 2 token calls = 3 total
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/chains')) {
          return { ok: true, json: async () => mockChains };
        }
        if (url.includes('/api/tokens/solana')) {
          return { ok: true, json: async () => mockSolanaTokens };
        }
        if (url.includes('/api/tokens/base')) {
          return { ok: true, json: async () => mockBaseTokens };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      });

      const pairs = await client.getSupportedPairs();

      expect(Array.isArray(pairs)).toBe(true);
      expect(pairs.length).toBe(2); // solana->base USDC + base->solana USDC

      // Verify structure
      pairs.forEach((pair) => {
        expect(pair).toHaveProperty('sourceChain');
        expect(pair).toHaveProperty('sourceToken');
        expect(pair).toHaveProperty('destinationChain');
        expect(pair).toHaveProperty('destinationToken');
        expect(pair.sourceChain.id).not.toBe(pair.destinationChain.id);
      });

      // Verify only 3 API calls (chains + solana tokens + base tokens)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
