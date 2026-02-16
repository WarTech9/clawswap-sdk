/**
 * Mock x402 payment for testing without a real wallet
 *
 * This allows running examples in CI/CD or for testing
 * without requiring blockchain transactions.
 */

export function createMockFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    // Call the actual API
    const response = await fetch(input, init);

    // If 402 Payment Required, log and return response as-is
    // In a real scenario, the API would need a test mode to bypass payment
    if (response.status === 402) {
      console.log('[MOCK] Would have paid $0.50 USDC via x402');
      console.log('[MOCK] Endpoint:', url);
      // Note: The actual swap won't execute without real payment
      // This is just for testing the SDK integration
    }

    return response;
  };
}
