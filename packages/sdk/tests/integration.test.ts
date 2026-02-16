import { describe, it, expect, beforeAll } from 'vitest';
import { ClawSwapClient } from '../src/client';

/**
 * Integration tests for ClawSwap SDK
 * These tests run against the live API (or can be configured for staging)
 *
 * Note: executeSwap tests are skipped by default as they require payment
 */
describe('Integration Tests', () => {
  let client: ClawSwapClient;
  const apiUrl = process.env.CLAWSWAP_API_URL || 'https://api.clawswap.dev';

  beforeAll(() => {
    client = new ClawSwapClient({
      baseUrl: apiUrl,
      timeout: 30000,
    });
  });

  describe('Discovery Endpoints (Free)', () => {
    it('should fetch supported chains', async () => {
      const chains = await client.getSupportedChains();

      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);

      // Verify chain structure
      const chain = chains[0];
      expect(chain).toHaveProperty('id');
      expect(chain).toHaveProperty('name');
      expect(chain).toHaveProperty('nativeCurrency');
      expect(chain.nativeCurrency).toHaveProperty('symbol');
      expect(chain.nativeCurrency).toHaveProperty('decimals');
    });

    it('should fetch supported tokens for Solana', async () => {
      const tokens = await client.getSupportedTokens('solana');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);

      // Verify token structure
      const token = tokens[0];
      expect(token).toHaveProperty('address');
      expect(token).toHaveProperty('symbol');
      expect(token).toHaveProperty('name');
      expect(token).toHaveProperty('decimals');
      expect(token).toHaveProperty('chainId');
      expect(token.chainId).toBe('solana');
    });

    it('should fetch supported tokens for Base', async () => {
      const tokens = await client.getSupportedTokens('base');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);

      const token = tokens[0];
      expect(token.chainId).toBe('base');
    });

    it('should derive supported pairs', async () => {
      const pairs = await client.getSupportedPairs();

      expect(Array.isArray(pairs)).toBe(true);
      expect(pairs.length).toBeGreaterThan(0);

      // Verify pair structure
      const pair = pairs[0];
      expect(pair).toHaveProperty('sourceChain');
      expect(pair).toHaveProperty('sourceToken');
      expect(pair).toHaveProperty('destinationChain');
      expect(pair).toHaveProperty('destinationToken');

      // Source and destination chains should be different
      expect(pair.sourceChain).not.toBe(pair.destinationChain);
    });
  });

  describe('Quote Endpoint (Free)', () => {
    it('should get a quote for SOL -> USDC on Base', async () => {
      const chains = await client.getSupportedChains();
      const solanaTokens = await client.getSupportedTokens('solana');
      const baseTokens = await client.getSupportedTokens('base');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const baseUSDC = baseTokens.find((t) => t.symbol === 'USDC');

      // Skip if tokens not available
      if (!solanaUSDC || !baseUSDC) {
        console.log('Skipping: USDC not available on both chains');
        return;
      }

      const quote = await client.getQuote({
        sourceChainId: 'solana',
        sourceTokenAddress: solanaUSDC.address,
        destinationChainId: 'base',
        destinationTokenAddress: baseUSDC.address,
        amount: '1000000', // 1 USDC (6 decimals)
        senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });

      // Verify quote structure
      expect(quote).toHaveProperty('id');
      expect(quote).toHaveProperty('sourceAmount');
      expect(quote).toHaveProperty('destinationAmount');
      expect(quote).toHaveProperty('fees');
      expect(quote.fees).toHaveProperty('totalFeeUsd');
      expect(quote).toHaveProperty('estimatedTimeSeconds');
      expect(quote).toHaveProperty('expiresAt');
      expect(quote).toHaveProperty('expiresIn');
      expect(quote).toHaveProperty('transactionData');

      // Verify values
      expect(quote.sourceAmount).toBe('1000000');
      expect(quote.expiresIn).toBeLessThanOrEqual(30);
      expect(quote.expiresIn).toBeGreaterThan(0);

      // Verify destination amount is reasonable (accounting for fees)
      const destAmount = parseFloat(quote.destinationAmount);
      expect(destAmount).toBeGreaterThan(900000); // At least 0.9 USDC
      expect(destAmount).toBeLessThanOrEqual(1000000); // At most 1 USDC
    });

    it('should include fee breakdown in quote', async () => {
      const chains = await client.getSupportedChains();
      const solanaTokens = await client.getSupportedTokens('solana');
      const baseTokens = await client.getSupportedTokens('base');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const baseUSDC = baseTokens.find((t) => t.symbol === 'USDC');

      if (!solanaUSDC || !baseUSDC) return;

      const quote = await client.getQuote({
        sourceChainId: 'solana',
        sourceTokenAddress: solanaUSDC.address,
        destinationChainId: 'base',
        destinationTokenAddress: baseUSDC.address,
        amount: '1000000',
        senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });

      // Verify fee structure (v2 API format)
      expect(quote).toHaveProperty('fees');
      expect(quote.fees).toHaveProperty('totalFeeUsd');
      expect(quote.fees).toHaveProperty('relayerFee');
      expect(quote.fees).toHaveProperty('gasSolLamports');

      // Verify fee values are reasonable
      const totalFee = parseFloat(quote.fees.totalFeeUsd);
      expect(totalFee).toBeGreaterThan(0);
      expect(totalFee).toBeLessThan(100); // Sanity check
    });
  });

  describe.skip('Swap Execution (Requires Payment)', () => {
    // These tests are skipped by default as they require x402 payment
    // To run: set ENABLE_PAID_TESTS=true and provide x402-wrapped fetch

    it.skip('should execute a swap with x402 payment', async () => {
      // This test requires x402-wrapped fetch
      // Example implementation:
      /*
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);
      const client = new ClawSwapClient({ fetch: fetchWithPayment });

      const executeResponse = await client.executeSwap({
        sourceChainId: 'solana',
        sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        destinationChainId: 'base',
        destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1000000',
        senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });

      expect(executeResponse).toHaveProperty('transaction');
      expect(executeResponse).toHaveProperty('metadata');
      expect(executeResponse.metadata).toHaveProperty('orderId');
      expect(executeResponse.metadata).toHaveProperty('paymentAmount');
      expect(executeResponse.metadata).toHaveProperty('gasLamports');
      */
    });

    it.skip('should poll swap status until completion', async () => {
      // This test requires a real swap ID from previous test
      /*
      const result = await client.waitForSettlement('swap-id', {
        timeout: 300000, // 5 minutes
        interval: 5000,  // Poll every 5 seconds
      });

      expect(['completed', 'failed', 'expired']).toContain(result.status);
      */
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid chain ID', async () => {
      await expect(client.getSupportedTokens('invalid-chain')).rejects.toThrow();
    });

    it('should handle invalid quote parameters', async () => {
      await expect(
        client.getQuote({
          sourceChainId: 'solana',
          sourceTokenAddress: 'invalid',
          destinationChainId: 'base',
          destinationTokenAddress: 'invalid',
          amount: '1000000',
          senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
          recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should fetch chains quickly (< 2s)', async () => {
      const start = Date.now();
      await client.getSupportedChains();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });

    it('should fetch tokens quickly (< 2s)', async () => {
      const start = Date.now();
      await client.getSupportedTokens('solana');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });

    it('should get quote quickly (< 3s)', async () => {
      const chains = await client.getSupportedChains();
      const solanaTokens = await client.getSupportedTokens('solana');
      const baseTokens = await client.getSupportedTokens('base');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const baseUSDC = baseTokens.find((t) => t.symbol === 'USDC');

      if (!solanaUSDC || !baseUSDC) return;

      const start = Date.now();
      await client.getQuote({
        sourceChainId: 'solana',
        sourceTokenAddress: solanaUSDC.address,
        destinationChainId: 'base',
        destinationTokenAddress: baseUSDC.address,
        amount: '1000000',
        senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(3000);
    });
  });
});
