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
  const apiUrl = process.env.CLAWSWAP_API_URL || 'https://api.clawswap.xyz';

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
      expect(chain).toHaveProperty('nativeToken');
      expect(chain.nativeToken).toHaveProperty('symbol');
      expect(chain.nativeToken).toHaveProperty('decimals');
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

    it('should fetch supported tokens for Arbitrum', async () => {
      const tokens = await client.getSupportedTokens('arbitrum');

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);

      const token = tokens[0];
      expect(token.chainId).toBe('arbitrum');
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
    it('should get a quote for SOL -> USDC on Arbitrum', async () => {
      const chains = await client.getSupportedChains();
      const solanaTokens = await client.getSupportedTokens('solana');
      const arbitrumTokens = await client.getSupportedTokens('arbitrum');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const arbitrumUSDC = arbitrumTokens.find((t) => t.symbol === 'USDC');

      // Skip if tokens not available
      if (!solanaUSDC || !arbitrumUSDC) {
        console.log('Skipping: USDC not available on both chains');
        return;
      }

      const quote = await client.getQuote({
        sourceChainId: 'solana',
        sourceTokenAddress: solanaUSDC.address,
        destinationChainId: 'arbitrum',
        destinationTokenAddress: arbitrumUSDC.address,
        amount: '1000000', // 1 USDC (6 decimals)
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
      const arbitrumTokens = await client.getSupportedTokens('arbitrum');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const arbitrumUSDC = arbitrumTokens.find((t) => t.symbol === 'USDC');

      if (!solanaUSDC || !arbitrumUSDC) return;

      const quote = await client.getQuote({
        sourceChainId: 'solana',
        sourceTokenAddress: solanaUSDC.address,
        destinationChainId: 'arbitrum',
        destinationTokenAddress: arbitrumUSDC.address,
        amount: '1000000',
      });

      // Verify fee structure
      expect(quote).toHaveProperty('estimatedGasCost');
      expect(quote.estimatedGasCost).toHaveProperty('amount');
      expect(quote.estimatedGasCost).toHaveProperty('usdValue');

      expect(quote).toHaveProperty('relayerFee');
      expect(quote.relayerFee).toHaveProperty('amount');
      expect(quote.relayerFee).toHaveProperty('percent');
      expect(quote.relayerFee).toHaveProperty('usdValue');

      expect(quote).toHaveProperty('x402Fee');
      expect(quote.x402Fee).toHaveProperty('amount');
      expect(quote.x402Fee).toHaveProperty('usdValue');

      // x402 fee should be $0.50
      expect(quote.x402Fee.usdValue).toBe('0.50');
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

      const swap = await client.executeSwap({
        sourceChainId: 'solana',
        sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        destinationChainId: 'base',
        destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1000000',
        destinationAddress: '0xYourAddress',
      });

      expect(swap).toHaveProperty('swapId');
      expect(swap.status).toBe('pending');
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
          destinationChainId: 'arbitrum',
          destinationTokenAddress: 'invalid',
          amount: '1000000',
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
      const arbitrumTokens = await client.getSupportedTokens('arbitrum');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const arbitrumUSDC = arbitrumTokens.find((t) => t.symbol === 'USDC');

      if (!solanaUSDC || !arbitrumUSDC) return;

      const start = Date.now();
      await client.getQuote({
        sourceChainId: 'solana',
        sourceTokenAddress: solanaUSDC.address,
        destinationChainId: 'arbitrum',
        destinationTokenAddress: arbitrumUSDC.address,
        amount: '1000000',
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(3000);
    });
  });
});
