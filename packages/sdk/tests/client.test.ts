import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClawSwapClient } from '../src/client';
import type { QuoteResponse, SwapResponse, StatusResponse, Chain, Token } from '../src/types';
import {
  InsufficientLiquidityError,
  QuoteExpiredError,
  PaymentRequiredError,
  TimeoutError,
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
      sourceChainId: 'solana',
      sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationChainId: 'base',
      destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '1000000',
      senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
      recipientAddress: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
    };

    it('should return quote response successfully', async () => {
      const mockQuote: QuoteResponse = {
        id: 'quote-123',
        sourceAmount: '1000000',
        destinationAmount: '999000',
        fees: {
          operatingExpenses: '1000',
          networkFee: '500',
          totalFeeUsd: 0.502,
          relayerFee: '1000',
          relayerFeeFormatted: '0.001',
          gasSolLamports: '5000',
          gasSolFormatted: '0.000005',
          gasUsd: '0.001',
        },
        estimatedTimeSeconds: 300,
        expiresAt: new Date(Date.now() + 30000).toISOString(),
        expiresIn: 30,
        transactionData: {
          instructions: [],
        },
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
          sourceChainId: '',
          sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          destinationChainId: 'base',
          destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          amount: '1000000',
        })
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
          code: 'INSUFFICIENT_LIQUIDITY',
          message: 'Not enough liquidity',
        }),
      });

      await expect(client.getQuote(validQuoteRequest)).rejects.toThrow(
        InsufficientLiquidityError
      );
    });
  });

  describe('executeSwap', () => {
    const validExecuteRequest = {
      sourceChainId: 'solana',
      sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      destinationChainId: 'base',
      destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      amount: '1000000',
      senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
      recipientAddress: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
    };

    it('should execute swap successfully', async () => {
      const mockExecuteResponse = {
        transaction: 'base64-encoded-transaction-data',
        metadata: {
          orderId: 'order-123',
          paymentAmount: '500000',
          gasLamports: '5000',
          isToken2022: false,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockExecuteResponse,
      });

      const result = await client.executeSwap(validExecuteRequest);

      expect(result).toEqual(mockExecuteResponse);
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
          code: 'PAYMENT_REQUIRED',
          message: 'Payment required',
        }),
      });

      await expect(client.executeSwap(validExecuteRequest)).rejects.toThrow(PaymentRequiredError);
    });

    it('should require senderAddress', async () => {
      await expect(
        client.executeSwap({
          ...validExecuteRequest,
          senderAddress: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return swap status', async () => {
      const mockStatus: StatusResponse = {
        swapId: 'swap-123',
        status: 'bridging',
        sourceChainId: 'solana',
        sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        sourceAmount: '1000000',
        destinationChainId: 'base',
        destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        destinationAmount: '999000',
        destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transactions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await client.getStatus('swap-123');

      expect(result).toEqual(mockStatus);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/swap/swap-123/status',
        expect.any(Object)
      );
    });
  });

  describe('waitForSettlement', () => {
    it('should poll until completed', async () => {
      const mockStatuses: StatusResponse[] = [
        {
          swapId: 'swap-123',
          status: 'pending',
          sourceChainId: 'solana',
          sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          sourceAmount: '1000000',
          destinationChainId: 'arbitrum',
          destinationTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          destinationAmount: '999000',
          destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          transactions: [],
        },
        {
          swapId: 'swap-123',
          status: 'bridging',
          sourceChainId: 'solana',
          sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          sourceAmount: '1000000',
          destinationChainId: 'arbitrum',
          destinationTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          destinationAmount: '999000',
          destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          transactions: [],
        },
        {
          swapId: 'swap-123',
          status: 'completed',
          sourceChainId: 'solana',
          sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          sourceAmount: '1000000',
          destinationChainId: 'arbitrum',
          destinationTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          destinationAmount: '999000',
          destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          transactions: [],
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

      const result = await client.waitForSettlement('swap-123', {
        interval: 10, // Fast polling for tests
      });

      expect(result.status).toBe('completed');
      expect(callCount).toBe(3);
    });

    it('should timeout if swap takes too long', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          swapId: 'swap-123',
          status: 'pending',
          sourceChainId: 'solana',
          sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          sourceAmount: '1000000',
          destinationChainId: 'arbitrum',
          destinationTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          destinationAmount: '999000',
          destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          transactions: [],
        }),
      });

      await expect(
        client.waitForSettlement('swap-123', {
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
          json: async () => ({ swapId: 'swap-123', status: 'pending' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ swapId: 'swap-123', status: 'completed' }),
        });

      await client.waitForSettlement('swap-123', {
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
  });

  describe('timeout handling', () => {
    it.skip('should timeout long requests', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({}),
                }),
              10000
            )
          )
      );

      await expect(client.getQuote({
        sourceChainId: 'solana',
        sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        destinationChainId: 'base',
        destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1000000',
        senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipientAddress: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
      })).rejects.toThrow('Request timed out');
    }, 10000);
  });

  describe('getSwapFee', () => {
    it('should return fee response', async () => {
      const mockFee = {
        amount: 0.1,
        currency: 'USDC',
        network: 'solana',
        description: 'x402 payment required per swap execution',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFee,
      });

      const result = await client.getSwapFee();

      expect(result).toEqual(mockFee);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.clawswap.dev/api/swap/fee',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should propagate network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getSwapFee()).rejects.toThrow();
    });
  });
});
