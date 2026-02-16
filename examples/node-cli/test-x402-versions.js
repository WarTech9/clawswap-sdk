/**
 * Test if we need to specify x402Versions
 */

async function testVersions() {
  const { x402Client } = await import('@x402/core/client');
  const { registerExactSvmScheme } = await import('@x402/svm/exact/client');

  // Try creating client with versions
  console.log('Testing with x402Versions parameter...\n');
  
  // Create a dummy signer
  const dummySigner = {
    address: '9bNAnkakMQ9acza3tq6jdC3PDZYxVty7r97v85Gd3VcN',
    signTransaction: async () => ({ signature: 'test' }),
  };

  const client = new x402Client();
  
  try {
    registerExactSvmScheme(client, {
      signer: dummySigner,
      networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
      x402Versions: [2, 1], // Try specifying versions
    });
    console.log('✓ Registered with x402Versions parameter');
  } catch (e) {
    console.log('✗ x402Versions parameter failed:', e.message);
    
    // Try without it
    try {
      registerExactSvmScheme(client, {
        signer: dummySigner,
        networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
      });
      console.log('✓ Registered without x402Versions parameter');
    } catch (e2) {
      console.log('✗ Both failed:', e2.message);
    }
  }
  
  console.log('\nClient type:', typeof client);
  console.log('Client keys:', Object.keys(client));
}

testVersions().catch(console.error);
