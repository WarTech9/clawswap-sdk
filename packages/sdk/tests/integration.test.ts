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

  });

  describe('Quote Endpoint (Free)', () => {
    it('should get a quote for USDC Solana -> USDC Base', async () => {
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
        sourceChain: 'solana',
        sourceToken: solanaUSDC.address,
        destinationChain: 'base',
        destinationToken: baseUSDC.address,
        amount: '1000000', // 1 USDC (6 decimals)
        userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });

      // Verify v2 quote structure
      expect(quote).toHaveProperty('estimatedOutput');
      expect(quote).toHaveProperty('estimatedOutputFormatted');
      expect(quote).toHaveProperty('estimatedTime');
      expect(quote).toHaveProperty('fees');
      expect(quote.fees).toHaveProperty('clawswap');
      expect(quote.fees).toHaveProperty('relay');
      expect(quote.fees).toHaveProperty('gas');
      expect(quote).toHaveProperty('route');
      expect(quote).toHaveProperty('supported');

      // Verify route structure
      expect(quote.route).toHaveProperty('sourceChain');
      expect(quote.route).toHaveProperty('sourceToken');
      expect(quote.route).toHaveProperty('destinationChain');
      expect(quote.route).toHaveProperty('destinationToken');
    });

    it('should include fee breakdown in quote', async () => {
      const solanaTokens = await client.getSupportedTokens('solana');
      const baseTokens = await client.getSupportedTokens('base');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const baseUSDC = baseTokens.find((t) => t.symbol === 'USDC');

      if (!solanaUSDC || !baseUSDC) return;

      const quote = await client.getQuote({
        sourceChain: 'solana',
        sourceToken: solanaUSDC.address,
        destinationChain: 'base',
        destinationToken: baseUSDC.address,
        amount: '1000000',
        userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });

      // Verify v2 fee structure
      expect(quote).toHaveProperty('fees');
      expect(quote.fees).toHaveProperty('clawswap');
      expect(quote.fees).toHaveProperty('relay');
      expect(quote.fees).toHaveProperty('gas');
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
        sourceChain: 'solana',
        sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        destinationChain: 'base',
        destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '1000000',
        userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });

      expect(executeResponse).toHaveProperty('requestId');
      expect(executeResponse).toHaveProperty('transaction');
      expect(executeResponse).toHaveProperty('sourceChain');
      expect(executeResponse).toHaveProperty('estimatedOutput');
      expect(executeResponse).toHaveProperty('fees');
      expect(executeResponse).toHaveProperty('instructions');
      */
    });

    it.skip('should poll swap status until completion', async () => {
      // This test requires a real swap ID from previous test
      /*
      const result = await client.waitForSettlement('request-id', {
        timeout: 300000, // 5 minutes
        interval: 5000,  // Poll every 5 seconds
      });

      expect(['completed', 'failed']).toContain(result.status);
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
          sourceChain: 'solana',
          sourceToken: 'invalid',
          destinationChain: 'base',
          destinationToken: 'invalid',
          amount: '1000000',
          userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
          recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
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
      const solanaTokens = await client.getSupportedTokens('solana');
      const baseTokens = await client.getSupportedTokens('base');

      const solanaUSDC = solanaTokens.find((t) => t.symbol === 'USDC');
      const baseUSDC = baseTokens.find((t) => t.symbol === 'USDC');

      if (!solanaUSDC || !baseUSDC) return;

      const start = Date.now();
      await client.getQuote({
        sourceChain: 'solana',
        sourceToken: solanaUSDC.address,
        destinationChain: 'base',
        destinationToken: baseUSDC.address,
        amount: '1000000',
        userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
        recipient: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(3000);
    });
  });
});
