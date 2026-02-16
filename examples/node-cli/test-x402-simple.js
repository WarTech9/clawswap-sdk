/**
 * Simple test to see if wrapFetchWithPayment actually processes 402 responses
 */

async function testX402Wrapper() {
  console.log('=== Testing x402 wrapper behavior ===\n');

  const { x402Client } = await import('@x402/core/client');
  const { wrapFetchWithPayment } = await import('@x402/fetch');

  // Create client without any schemes registered
  const client = new x402Client();
  console.log('1. Created x402Client (no schemes registered)');

  // Wrap fetch
  const wrappedFetch = wrapFetchWithPayment(fetch, client);
  console.log('2. Wrapped fetch\n');

  // Test with ClawSwap API (will get 402)
  console.log('3. Making request to ClawSwap API (expects 402)...');
  
  try {
    const response = await wrappedFetch('https://api.clawswap.dev/api/swap/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote: { id: "test" },
        userWallet: "test",
        sourceTokenMint: "test",
        sourceTokenDecimals: 6,
        paymentChain: "solana"
      }),
    });

    console.log('\nResponse status:', response.status);
    console.log('Response headers:');
    for (const [key, value] of response.headers) {
      if (key.toLowerCase().includes('payment')) {
        console.log(`  ${key}:`, value.substring(0, 100) + '...');
      }
    }

    if (response.status === 402) {
      console.log('\n❌ Wrapper did NOT intercept 402 - passed it through unchanged');
    } else {
      console.log('\n✅ Wrapper intercepted and processed the 402');
    }
  } catch (error) {
    console.log('\n✅ Wrapper threw error (attempting to process 402):', error.message);
  }
}

testX402Wrapper().catch(console.error);
