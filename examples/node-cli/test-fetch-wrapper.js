// Test to see if the wrapped fetch is actually being called

async function testWrapperInvocation() {
  const { x402Client } = await import('@x402/core/client');
  const { wrapFetchWithPayment } = await import('@x402/fetch');

  const client = new x402Client();
  console.log('✓ x402Client created');

  // Create a debug fetch wrapper
  const originalFetch = globalThis.fetch;
  const debugFetch = async (...args) => {
    console.log('\n[DEBUG] Fetch called with:');
    console.log('URL:', args[0]);
    console.log('Options:', JSON.stringify(args[1], null, 2));
    
    const response = await originalFetch(...args);
    
    console.log('[DEBUG] Response received:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    return response;
  };

  const wrappedFetch = wrapFetchWithPayment(debugFetch, client);
  console.log('✓ Fetch wrapped');
  console.log('Wrapped fetch type:', typeof wrappedFetch);

  // Test call
  try {
    console.log('\n[TEST] Making test request...');
    const response = await wrappedFetch('https://httpbin.org/status/402', {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Response status:', response.status);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testWrapperInvocation().catch(console.error);
