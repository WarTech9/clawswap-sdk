/**
 * Test what executeSwap actually returns
 */

async function testExecuteResponse() {
  const { x402Client } = await import('@x402/core/client');
  const { wrapFetchWithPayment } = await import('@x402/fetch');
  const { registerExactSvmScheme } = await import('@x402/svm/exact/client');
  const { createKeyPairSignerFromBytes } = await import('@solana/signers');
  const bs58 = await import('bs58');
  const dotenv = await import('dotenv');
  
  dotenv.config();
  
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY not set');
  }

  // Setup x402
  const client = new x402Client();
  const secretKey = bs58.default.decode(privateKey);
  const signer = await createKeyPairSignerFromBytes(secretKey);
  
  registerExactSvmScheme(client, {
    signer: signer,
    networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    x402Versions: [2, 1],
  });

  const wrappedFetch = wrapFetchWithPayment(fetch, client);

  // Make actual request
  const testPayload = {
    quote: { id: "0x8e0af74e4459305af95f821337135d2b46aa59eaba3601cdd3a1fb973c63065c" },
    userWallet: "9bNAnkakMQ9acza3tq6jdC3PDZYxVty7r97v85Gd3VcN",
    sourceTokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    sourceTokenDecimals: 6,
    paymentChain: "solana"
  };

  console.log('Making request to /api/swap/execute...\n');

  try {
    const response = await wrappedFetch('https://api.clawswap.dev/api/swap/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('\nResponse body (raw):');
    console.log(text);
    
    console.log('\nResponse body (parsed):');
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('(not JSON)');
    }
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testExecuteResponse().catch(console.error);
