/**
 * E2E Tests: Direct API
 *
 * Tests the ClawSwap HTTP API directly using raw fetch + x402.
 * No SDK involved — validates the API contract independently.
 *
 * Usage:
 *   # Free sections only (no private key needed):
 *   npx tsx e2e/api-direct.ts
 *
 *   # With x402 payment (deducts $0.50 USDC from Solana wallet):
 *   SOLANA_PRIVATE_KEY=<base58-key> npx tsx e2e/api-direct.ts
 *
 *   # Skip Solana transaction submission (sections 1-4 only):
 *   SOLANA_PRIVATE_KEY=<base58-key> SKIP_SUBMIT=true npx tsx e2e/api-direct.ts
 *
 * Environment Variables:
 *   SOLANA_PRIVATE_KEY    Base58-encoded Solana private key (required for sections 3-5)
 *   RECIPIENT_ADDRESS     EVM address to receive funds (default: test address)
 *   SKIP_SUBMIT           Set to "true" to skip transaction submission (section 5)
 *   CLAWSWAP_API_URL      Override API base URL
 */

import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.CLAWSWAP_API_URL ?? 'https://api.clawswap.dev';
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS ?? '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const SKIP_SUBMIT = process.env.SKIP_SUBMIT === 'true';

const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_USDT = '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2';
const TEST_SENDER = '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri';
const SWAP_AMOUNT = '1000000'; // 1 unit (6 decimals) — works for both USDC and USDT

// Execute test pair — override via env vars to test other pairs
const EXEC_SOURCE_TOKEN = process.env.SOURCE_TOKEN ?? SOLANA_USDC;
const EXEC_DEST_TOKEN = process.env.DEST_TOKEN ?? BASE_USDC;

// ─── Assertion helpers ──────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ ${label}`);
    failCount++;
    process.exitCode = 1;
  }
}

function section(title: string): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ ${title}`);
  console.log('─'.repeat(60));
}

async function apiGet<T>(path: string, fetchFn: typeof fetch = fetch): Promise<T> {
  const response = await fetchFn(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GET ${path} failed (${response.status}): ${body}`);
  }
  return response.json();
}

async function apiPost<T>(path: string, body: unknown, fetchFn: typeof fetch = fetch): Promise<T> {
  const response = await fetchFn(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${path} failed (${response.status}): ${text}`);
  }
  return response.json();
}

// ─── Section 1: Discovery ────────────────────────────────────────────────────

async function testDiscovery(): Promise<void> {
  section('Section 1 — Discovery (free, no payment)');

  const chains = await apiGet<{ chains: any[] }>('/api/chains');
  assert(Array.isArray(chains.chains), 'Response has chains array');
  assert(chains.chains.length > 0, 'At least one chain returned');

  const firstChain = chains.chains[0];
  assert(typeof firstChain.id === 'string', 'Chain has id (string)');
  assert(typeof firstChain.name === 'string', 'Chain has name (string)');
  assert(typeof firstChain.nativeCurrency === 'object', 'Chain has nativeCurrency (object)');
  assert(typeof firstChain.nativeCurrency.symbol === 'string', 'nativeCurrency has symbol');
  assert(typeof firstChain.nativeCurrency.decimals === 'number', 'nativeCurrency has decimals');

  const solana = chains.chains.find((c: any) => c.id === 'solana');
  assert(solana !== undefined, 'Solana chain present');
  const base = chains.chains.find((c: any) => c.id === 'base');
  assert(base !== undefined, 'Base chain present');

  const solanaTokens = await apiGet<{ tokens: any[] }>('/api/tokens/solana');
  assert(Array.isArray(solanaTokens.tokens), 'Solana tokens response has tokens array');
  assert(solanaTokens.tokens.length > 0, 'At least one Solana token returned');

  const solanaUsdc = solanaTokens.tokens.find((t: any) => t.symbol === 'USDC');
  assert(solanaUsdc !== undefined, 'Solana USDC token found');
  assert(solanaUsdc?.address === SOLANA_USDC, 'Solana USDC address matches');
  assert(solanaUsdc?.chainId === 'solana', 'Solana USDC chainId is "solana"');

  const baseTokens = await apiGet<{ tokens: any[] }>('/api/tokens/base');
  assert(Array.isArray(baseTokens.tokens), 'Base tokens response has tokens array');

  const baseUsdc = baseTokens.tokens.find((t: any) => t.symbol === 'USDC');
  assert(baseUsdc !== undefined, 'Base USDC token found');
  assert(baseUsdc?.chainId === 'base', 'Base USDC chainId is "base"');

  const fee = await apiGet<any>('/api/swap/fee');
  assert(typeof fee.x402Fee === 'object', 'Swap fee has x402Fee object');
  assert(typeof fee.x402Fee.amountUsd === 'number', 'x402Fee.amountUsd is a number');
  assert(typeof fee.x402Fee.currency === 'string', 'x402Fee.currency is a string');
  assert(typeof fee.gasReimbursement === 'object', 'Swap fee has gasReimbursement object');
  assert(typeof fee.bridgeFee === 'object', 'Swap fee has bridgeFee object');
  assert(typeof fee.note === 'string', 'Swap fee has note (string)');
  console.log(`\n  x402 fee: $${fee.x402Fee.amountUsd} ${fee.x402Fee.currency} on ${fee.x402Fee.network}`);
}

// ─── Section 2: Quote ────────────────────────────────────────────────────────

async function testQuoteForPair(
  sourceTokenAddress: string,
  destinationTokenAddress: string,
  pairLabel: string,
): Promise<void> {
  section(`Section 2 — Quote: ${pairLabel} (free, no payment)`);

  const quoteRequest = {
    sourceChain: 'solana',
    sourceToken: sourceTokenAddress,
    destinationChain: 'base',
    destinationToken: destinationTokenAddress,
    amount: SWAP_AMOUNT,
    userWallet: TEST_SENDER,
    recipient: RECIPIENT_ADDRESS,
  };

  const quote = await apiPost<any>('/api/swap/quote', quoteRequest);

  assert(typeof quote.estimatedOutput === 'string', 'Quote has estimatedOutput (string)');
  assert(typeof quote.estimatedOutputFormatted === 'string', 'Quote has estimatedOutputFormatted (string)');
  assert(typeof quote.estimatedTime === 'number', 'Quote has estimatedTime (number)');
  assert(typeof quote.fees === 'object', 'Quote has fees object');
  assert(typeof quote.fees.clawswap === 'string', 'fees.clawswap is a string');
  assert(typeof quote.fees.relay === 'string', 'fees.relay is a string');
  assert(typeof quote.fees.gas === 'string', 'fees.gas is a string');
  assert(typeof quote.route === 'object', 'Quote has route object');
  assert(typeof quote.supported === 'boolean', 'Quote has supported (boolean)');

  const destAmount = parseFloat(quote.estimatedOutput);
  const inputAmount = Number(SWAP_AMOUNT);
  assert(destAmount > inputAmount * 0.9, `Estimated output > 90% of input (got ${destAmount}, input ${inputAmount})`);

  console.log(`\n  Estimated output: ${quote.estimatedOutputFormatted}`);
  console.log(`  Fees — ClawSwap: ${quote.fees.clawswap} | Relay: ${quote.fees.relay} | Gas: ${quote.fees.gas}`);
  console.log(`  Estimated time: ${quote.estimatedTime}s`);
}

// ─── Section 3: Execute (requires SOLANA_PRIVATE_KEY) ───────────────────────

async function testExecute(): Promise<{ transaction: string; requestId: string } | null> {
  section('Section 3 — Execute (requires x402 payment)');

  if (!SOLANA_PRIVATE_KEY) {
    console.log('  ⏭  SKIPPED — set SOLANA_PRIVATE_KEY to run this section');
    return null;
  }

  // Setup x402 client
  const { x402Client } = await import('@x402/core/client');
  const { wrapFetchWithPayment } = await import('@x402/fetch');
  const { registerExactSvmScheme } = await import('@x402/svm/exact/client');
  const { createKeyPairSignerFromBytes } = await import('@solana/signers');
  const { Keypair } = await import('@solana/web3.js');
  const bs58 = await import('bs58');

  const x402 = new x402Client();
  const secretKey = bs58.default.decode(SOLANA_PRIVATE_KEY);
  const signer = await createKeyPairSignerFromBytes(secretKey);

  // Derive the actual wallet address from the private key
  const keypairForAddress = Keypair.fromSecretKey(secretKey);
  const senderAddress = keypairForAddress.publicKey.toBase58();
  console.log(`  Sender address (derived from key): ${senderAddress}`);

  registerExactSvmScheme(x402, {
    signer,
    networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    x402Versions: [2, 1],
  } as any);

  const fetchWithPayment = wrapFetchWithPayment(fetch, x402);

  const execPairLabel = `${EXEC_SOURCE_TOKEN === SOLANA_USDC ? 'USDC' : 'USDT'} (Sol) → ${EXEC_DEST_TOKEN === BASE_USDC ? 'USDC' : 'USDT'} (Base)`;
  console.log(`  Pair: ${execPairLabel}`);

  const executeRequest = {
    sourceChain: 'solana',
    sourceToken: EXEC_SOURCE_TOKEN,
    destinationChain: 'base',
    destinationToken: EXEC_DEST_TOKEN,
    amount: SWAP_AMOUNT,
    userWallet: senderAddress,
    recipient: RECIPIENT_ADDRESS,
  };

  console.log('  Sending execute request (x402 payment will be deducted)...');
  const response = await apiPost<any>('/api/swap/execute', executeRequest, fetchWithPayment);

  assert(typeof response.requestId === 'string', 'Response has requestId (string)');
  assert(typeof response.transaction === 'string', 'Response has transaction (base64 string)');
  assert(response.transaction.length > 0, 'Transaction is non-empty');
  assert(typeof response.sourceChain === 'string', 'Response has sourceChain');
  assert(typeof response.estimatedOutput === 'string', 'Response has estimatedOutput');
  assert(typeof response.estimatedTime === 'number', 'Response has estimatedTime');
  assert(typeof response.fees === 'object', 'Response has fees object');
  assert(typeof response.fees.clawswap === 'string', 'fees.clawswap is a string');
  assert(typeof response.instructions === 'string', 'Response has instructions');

  console.log(`\n  Request ID: ${response.requestId}`);
  console.log(`  Estimated output: ${response.estimatedOutput}`);
  console.log(`  Fees — ClawSwap: ${response.fees.clawswap} | Relay: ${response.fees.relay} | Gas: ${response.fees.gas}`);
  console.log(`  Transaction size: ${response.transaction.length} base64 chars`);

  return { transaction: response.transaction, requestId: response.requestId };
}

// ─── Section 4: Status ───────────────────────────────────────────────────────

async function testStatus(requestId: string): Promise<void> {
  section('Section 4 — Status check (free)');

  const response = await apiGet<any>(`/api/swap/${requestId}/status`);

  assert(typeof response.requestId === 'string', 'Status has requestId');
  assert(typeof response.status === 'string', 'Status has status field');
  assert(typeof response.sourceChain === 'string', 'Status has sourceChain');
  assert(typeof response.destinationChain === 'string', 'Status has destinationChain');
  assert(typeof response.outputAmount === 'string', 'Status has outputAmount');

  const validStatuses = ['pending', 'submitted', 'filling', 'completed', 'failed'];
  assert(validStatuses.includes(response.status), `Status "${response.status}" is a known value`);

  console.log(`\n  Request: ${response.requestId}`);
  console.log(`  Status: ${response.status}`);
}

// ─── Section 5: Sign & Submit ────────────────────────────────────────────────

async function testSignAndSubmit(transaction: string, requestId: string): Promise<void> {
  section('Section 5 — Sign & Submit Solana Transaction');

  if (SKIP_SUBMIT) {
    console.log('  ⏭  SKIPPED — SKIP_SUBMIT=true');
    return;
  }

  if (!SOLANA_PRIVATE_KEY) {
    console.log('  ⏭  SKIPPED — SOLANA_PRIVATE_KEY required for transaction signing');
    return;
  }

  const bs58 = await import('bs58');
  const { Connection, Transaction, Keypair } = await import('@solana/web3.js');

  const secretKey = bs58.default.decode(SOLANA_PRIVATE_KEY);
  const keypair = Keypair.fromSecretKey(secretKey);

  const txBuffer = Buffer.from(transaction, 'base64');
  const tx = Transaction.from(txBuffer);

  console.log(`  Signing with: ${keypair.publicKey.toBase58()}`);
  tx.partialSign(keypair);
  assert(true, 'Transaction signed');

  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  assert(typeof signature === 'string' && signature.length > 0, 'Transaction submitted to Solana');
  console.log(`  Signature: ${signature}`);
  console.log(`  Solscan: https://solscan.io/tx/${signature}`);

  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  assert(!confirmation.value.err, 'Transaction confirmed on Solana');

  // Poll status until terminal
  console.log(`\n  Polling status for request ${requestId}...`);
  const terminal = ['completed', 'failed'];
  let finalStatus: string = 'pending';
  const timeout = Date.now() + 300_000; // 5 min

  while (Date.now() < timeout) {
    const status = await apiGet<any>(`/api/swap/${requestId}/status`);
    finalStatus = status.status;
    console.log(`  Status: ${finalStatus}`);
    if (terminal.includes(finalStatus)) break;
    await new Promise((r) => setTimeout(r, 3000));
  }

  assert(
    finalStatus === 'completed',
    `Swap reached success state (got: ${finalStatus})`
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let senderAddress = 'not set';
  if (SOLANA_PRIVATE_KEY) {
    const bs58 = await import('bs58');
    const { Keypair } = await import('@solana/web3.js');
    senderAddress = Keypair.fromSecretKey(bs58.default.decode(SOLANA_PRIVATE_KEY)).publicKey.toBase58();
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ClawSwap API Direct E2E Tests                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nAPI: ${API_URL}`);
  console.log(`Recipient: ${RECIPIENT_ADDRESS}`);
  console.log(`Sender: ${senderAddress}`);
  console.log(`Payment key: ${SOLANA_PRIVATE_KEY ? 'set ✓' : 'not set (sections 3-5 skipped)'}`);
  console.log(`Submit transaction: ${SKIP_SUBMIT ? 'skipped (SKIP_SUBMIT=true)' : 'yes (default)'}`);

  try {
    await testDiscovery();
    // Quote tests — free, no payment required
    await testQuoteForPair(SOLANA_USDC, BASE_USDC, 'USDC (Sol) → USDC (Base)');
    await testQuoteForPair(SOLANA_USDC, BASE_USDT, 'USDC (Sol) → USDT (Base)');
    await testQuoteForPair(SOLANA_USDT, BASE_USDC, 'USDT (Sol) → USDC (Base)');

    const executeResult = await testExecute();

    if (executeResult) {
      await testStatus(executeResult.requestId);
      await testSignAndSubmit(executeResult.transaction, executeResult.requestId);
    }
  } catch (error) {
    console.error('\n  💥 Unexpected error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  if (failCount === 0) {
    console.log('✅ All assertions passed');
  } else {
    console.log(`❌ ${failCount} assertion(s) failed`);
  }
}

main();
