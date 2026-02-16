/**
 * Direct test of x402 wrapper with ClawSwap API
 */

async function testX402WithClawSwap() {
  console.log('=== Testing x402 wrapper with ClawSwap API ===\n');

  // Import x402
  const { x402Client } = await import('@x402/core/client');
  const { wrapFetchWithPayment } = await import('@x402/fetch');
  const { registerExactSvmScheme } = await import('@x402/svm/exact/client');
  const { createKeyPairSignerFromBytes } = await import('@solana/signers');
  const bs58 = await import('bs58');
  const dotenv = await import('dotenv');
  
  dotenv.config();
  
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY not set in .env');
  }

  // Create client
  console.log('1. Creating x402Client...');
  const client = new x402Client();
  console.log('✓ Client created\n');

  // Register Solana scheme
  console.log('2. Registering Solana scheme...');
  const secretKey = bs58.default.decode(privateKey);
  const signer = await createKeyPairSignerFromBytes(secretKey);
  
  registerExactSvmScheme(client, {
    signer: signer,
    networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  });
  console.log('✓ Scheme registered for network: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp\n');

  // Wrap fetch
  console.log('3. Wrapping fetch...');
  const wrappedFetch = wrapFetchWithPayment(fetch, client);
  console.log('✓ Fetch wrapped\n');

  // Make request
  console.log('4. Making request to ClawSwap API...');
  const testPayload = {
    quote: { id: "test" },
    userWallet: "9bNAnkakMQ9acza3tq6jdC3PDZYxVty7r97v85Gd3VcN",
    sourceTokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    sourceTokenDecimals: 6,
    paymentChain: "solana"
  };

  try {
    const response = await wrappedFetch('https://api.clawswap.dev/api/swap/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('\n=== RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('\n✓ SUCCESS! Payment was handled automatically!');
      console.log('Response data:', data);
    } else {
      console.log('\n✗ FAILED - Got status:', response.status);
      const text = await response.text();
      console.log('Response body:', text);
    }
  } catch (error) {
    console.log('\n✗ ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
}

testX402WithClawSwap().catch(console.error);
