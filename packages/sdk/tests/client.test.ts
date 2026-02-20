import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ClawSwapClient } from '../src/client';
import type { QuoteResponse, SwapResponse, StatusResponse, Chain, Token, EvmTransaction, ExecuteSwapResponse } from '../src/types';
import { isEvmTransaction, isEvmSource, isSolanaSource } from '../src/types';
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
        quoteId: 'quote-123',
        sourceAmount: '1000000',
        destinationAmount: '999000',
        fees: {
          bridgeFeeUsd: 0.25,
          x402FeeUsd: 0.50,
          gasReimbursementEstimatedUsd: 0.002,
          totalEstimatedFeeUsd: 0.752,
        },
        estimatedTimeSeconds: 300,
        expiresAt: new Date(Date.now() + 30000).toISOString(),
        expiresIn: 30,
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
        orderId: 'order-123',
        isToken2022: false,
        accounting: {
          x402Fee: {
            amountUsd: 0.50,
            currency: 'USDC',
            recipient: 'x402-treasury-address',
            note: 'x402 payment for swap execution',
          },
          gasReimbursement: {
            amountRaw: '5000',
            amountFormatted: '0.000005',
            tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            recipient: 'recipient-address',
            note: 'Gas reimbursement for Base transaction',
          },
          bridgeFee: {
            estimatedUsd: 0.25,
            note: 'Relay bridge fee',
          },
          sourceAmount: '1000000',
          destinationAmount: '999000',
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
        orderId: 'order-123',
        status: 'fulfilled',
        sourceChainId: 'solana',
        destinationChainId: 'base',
        sourceAmount: '1000000',
        destinationAmount: '999000',
        sourceTxHash: '5J7Qstq6afbmW9mAW4GvKBZkLXhJ9J1UmZJpZEhcZcZz',
        destinationTxHash: '0xabc123def456...',
        explorerUrl: 'https://basescan.org/tx/0xabc123def456...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
          orderId: 'swap-123',
          status: 'pending',
          sourceChainId: 'solana',
          sourceAmount: '1000000',
          destinationChainId: 'base',
          destinationAmount: '999000',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          orderId: 'swap-123',
          status: 'created',
          sourceChainId: 'solana',
          sourceAmount: '1000000',
          destinationChainId: 'base',
          destinationAmount: '999000',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          orderId: 'swap-123',
          status: 'completed',
          sourceChainId: 'solana',
          sourceAmount: '1000000',
          destinationChainId: 'base',
          destinationAmount: '999000',
          sourceTxHash: '5J7Qstq6afbmW9mAW4GvKBZkLXhJ9J1UmZJpZEhcZcZz',
          destinationTxHash: '0xabc123def456...',
          explorerUrl: 'https://basescan.org/tx/0xabc123def456...',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          orderId: 'swap-123',
          status: 'pending',
          sourceChainId: 'solana',
          sourceAmount: '1000000',
          destinationChainId: 'base',
          destinationAmount: '999000',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          json: async () => ({
            orderId: 'swap-123',
            status: 'pending',
            sourceChainId: 'solana',
            destinationChainId: 'base',
            sourceAmount: '1000000',
            destinationAmount: '999000',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            orderId: 'swap-123',
            status: 'completed',
            sourceChainId: 'solana',
            destinationChainId: 'base',
            sourceAmount: '1000000',
            destinationAmount: '999000',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
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
    it('should return fee breakdown response', async () => {
      const mockFee = {
        x402Fee: {
          amountUsd: 0.5,
          currency: 'USDC',
          network: 'solana',
          appliesTo: 'Solana-source swaps only',
          description: 'x402 payment required per swap execution',
        },
        gasReimbursement: {
          estimatedUsd: '~0.001',
          currency: 'USDC or USDT',
          appliesTo: 'Solana-source swaps only',
          description: 'Reimburses gas costs',
        },
        bridgeFee: {
          estimatedUsd: '~0.03–0.05',
          currency: 'Source token',
          appliesTo: 'All swaps',
          description: 'Relay bridge fee',
        },
        note: 'Solana-source: total cost = x402Fee + gasReimbursement + bridgeFee',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFee,
      });

      const result = await client.getSwapFee();

      expect(result).toEqual(mockFee);
      expect(result.x402Fee.amountUsd).toBe(0.5);
      expect(result.gasReimbursement.estimatedUsd).toBe('~0.001');
      expect(result.bridgeFee.estimatedUsd).toBe('~0.03–0.05');
      expect(typeof result.note).toBe('string');
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

  describe('executeSwap (Base → Solana)', () => {
    const baseToSolanaRequest = {
      sourceChainId: 'base',
      sourceTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      destinationChainId: 'solana',
      destinationTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '1000000',
      senderAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      recipientAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
    };

    it('should handle transactions array in response', async () => {
      const mockResponse = {
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
        orderId: '0xfedcba',
        isToken2022: false,
        accounting: {
          x402Fee: { amountUsd: 0, currency: 'USDC', recipient: 'none', note: 'No x402 fee for EVM-source swaps' },
          gasReimbursement: null,
          bridgeFee: { estimatedUsd: 0.037, note: 'Relay bridge fee' },
          sourceAmount: '1000000',
          destinationAmount: '962766',
        },
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
      expect(result.accounting.gasReimbursement).toBeNull();
      expect(result.accounting.x402Fee.amountUsd).toBe(0);
      expect(result.isToken2022).toBe(false);
    });

    it('should not require x402 payment for Base-source swaps', async () => {
      const mockResponse = {
        transactions: [
          { to: '0xabc', data: '0x123', value: '0', chainId: 8453 },
        ],
        orderId: '0xdef',
        isToken2022: false,
        accounting: {
          x402Fee: { amountUsd: 0, currency: 'USDC', recipient: 'none', note: 'No x402 fee' },
          gasReimbursement: null,
          bridgeFee: { estimatedUsd: 0.037, note: 'Relay bridge fee' },
          sourceAmount: '1000000',
          destinationAmount: '962766',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.executeSwap(baseToSolanaRequest);

      // Verify no 402 error was thrown (no x402 payment needed)
      expect(result.orderId).toBe('0xdef');
      expect(result.accounting.x402Fee.amountUsd).toBe(0);
    });
  });

  describe('isEvmTransaction (deprecated)', () => {
    it('should return true for EVM transaction objects', () => {
      const evmTx: EvmTransaction = {
        to: '0xa5F565650890Fba1824Ee0F21EbBbF660a179934',
        data: '0xabcdef',
        value: '0',
        chainId: 8453,
      };
      expect(isEvmTransaction(evmTx)).toBe(true);
    });

    it('should return false for strings', () => {
      expect(isEvmTransaction('AQAAAAAAAAAAAAAAAACAAQAHDw...')).toBe(false);
    });
  });

  describe('isEvmSource / isSolanaSource', () => {
    it('should identify EVM source responses (transactions array)', () => {
      const evmResponse: ExecuteSwapResponse = {
        transactions: [
          { to: '0xabc', data: '0x123', value: '0', chainId: 8453 },
        ],
        orderId: 'order-123',
        isToken2022: false,
        accounting: {
          x402Fee: { amountUsd: 0, currency: 'USDC', recipient: 'none', note: '' },
          gasReimbursement: null,
          bridgeFee: { estimatedUsd: 0.037, note: '' },
          sourceAmount: '1000000',
          destinationAmount: '962766',
        },
      };
      expect(isEvmSource(evmResponse)).toBe(true);
      expect(isSolanaSource(evmResponse)).toBe(false);
    });

    it('should identify Solana source responses (transaction string)', () => {
      const solanaResponse: ExecuteSwapResponse = {
        transaction: 'AQAAAAAAAAAAAAAAAACAAQAHDw...',
        orderId: 'order-456',
        isToken2022: false,
        accounting: {
          x402Fee: { amountUsd: 0.5, currency: 'USDC', recipient: 'treasury', note: '' },
          gasReimbursement: { amountRaw: '5000', amountFormatted: '0.000005', tokenMint: 'USDC', recipient: 'addr', note: '' },
          bridgeFee: { estimatedUsd: 0.037, note: '' },
          sourceAmount: '1000000',
          destinationAmount: '962766',
        },
      };
      expect(isSolanaSource(solanaResponse)).toBe(true);
      expect(isEvmSource(solanaResponse)).toBe(false);
    });
  });

  describe('getSupportedPairs', () => {
    it('should return all valid cross-chain pairs', async () => {
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

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockChains })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSolanaTokens })
        .mockResolvedValueOnce({ ok: true, json: async () => mockBaseTokens })
        .mockResolvedValueOnce({ ok: true, json: async () => mockBaseTokens })
        .mockResolvedValueOnce({ ok: true, json: async () => mockSolanaTokens });

      const pairs = await client.getSupportedPairs();

      expect(Array.isArray(pairs)).toBe(true);
      expect(pairs.length).toBeGreaterThan(0);

      // Verify structure
      pairs.forEach((pair) => {
        expect(pair).toHaveProperty('sourceChain');
        expect(pair).toHaveProperty('sourceToken');
        expect(pair).toHaveProperty('destinationChain');
        expect(pair).toHaveProperty('destinationToken');

        // Verify no same-chain pairs
        expect(pair.sourceChain.id).not.toBe(pair.destinationChain.id);
      });
    });
  });
});
