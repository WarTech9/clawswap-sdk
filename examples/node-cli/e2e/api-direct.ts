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
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TEST_SENDER = '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri';
const SWAP_AMOUNT = '1000000'; // 1 USDC (6 decimals) — change to test different amounts

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
  assert(typeof fee.amount === 'number', 'Swap fee has amount (number)');
  assert(typeof fee.currency === 'string', 'Swap fee has currency (string)');
  assert(typeof fee.network === 'string', 'Swap fee has network (string)');
  assert(typeof fee.description === 'string', 'Swap fee has description (string)');
  console.log(`\n  Swap fee: ${fee.amount} ${fee.currency} on ${fee.network}`);
}

// ─── Section 2: Quote ────────────────────────────────────────────────────────

async function testQuote(): Promise<{ quoteId: string; sourceAmount: string }> {
  section('Section 2 — Quote (free, no payment)');

  const quoteRequest = {
    sourceChainId: 'solana',
    sourceTokenAddress: SOLANA_USDC,
    destinationChainId: 'base',
    destinationTokenAddress: BASE_USDC,
    amount: SWAP_AMOUNT,
    senderAddress: TEST_SENDER,
    recipientAddress: RECIPIENT_ADDRESS,
  };

  const quote = await apiPost<any>('/api/swap/quote', quoteRequest);

  assert(typeof quote.quoteId === 'string' && quote.quoteId.length > 0, 'Quote has quoteId');
  assert(typeof quote.sourceAmount === 'string', 'Quote has sourceAmount (string)');
  assert(typeof quote.destinationAmount === 'string', 'Quote has destinationAmount (string)');
  assert(typeof quote.fees === 'object', 'Quote has fees object');
  assert(typeof quote.fees.totalEstimatedFeeUsd === 'number', 'fees.totalEstimatedFeeUsd is a number');
  assert(typeof quote.fees.bridgeFeeUsd === 'number', 'fees.bridgeFeeUsd is a number');
  assert(typeof quote.fees.x402FeeUsd === 'number', 'fees.x402FeeUsd is a number');
  assert(typeof quote.fees.gasReimbursementEstimatedUsd === 'number', 'fees.gasReimbursementEstimatedUsd is a number');
  assert(typeof quote.estimatedTimeSeconds === 'number', 'Quote has estimatedTimeSeconds');
  assert(typeof quote.expiresIn === 'number', 'Quote has expiresIn');
  assert(typeof quote.expiresAt === 'string', 'Quote has expiresAt (ISO string)');

  const destAmount = parseFloat(quote.destinationAmount);
  const inputAmount = Number(SWAP_AMOUNT);
  assert(destAmount > inputAmount * 0.9, `Destination amount > 90% of input (got ${destAmount}, input ${inputAmount})`);
  assert(destAmount <= inputAmount, `Destination amount ≤ input amount (got ${destAmount})`);
  assert(quote.fees.totalEstimatedFeeUsd > 0, `Total fee > 0 (got ${quote.fees.totalEstimatedFeeUsd})`);

  console.log(`\n  Quote ID: ${quote.quoteId}`);
  console.log(`  Destination: ${destAmount / 1e6} USDC`);
  console.log(`  Total Fee: $${quote.fees.totalEstimatedFeeUsd}`);
  console.log(`  Expires in: ${quote.expiresIn}s`);

  return { quoteId: quote.quoteId, sourceAmount: quote.sourceAmount };
}

// ─── Section 3: Execute (requires SOLANA_PRIVATE_KEY) ───────────────────────

async function testExecute(): Promise<{ transaction: string; orderId: string } | null> {
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

  const executeRequest = {
    sourceChainId: 'solana',
    sourceTokenAddress: SOLANA_USDC,
    destinationChainId: 'base',
    destinationTokenAddress: BASE_USDC,
    amount: SWAP_AMOUNT,
    senderAddress,
    recipientAddress: RECIPIENT_ADDRESS,
  };

  console.log('  Sending execute request (x402 payment will be deducted)...');
  const response = await apiPost<any>('/api/swap/execute', executeRequest, fetchWithPayment);

  assert(typeof response.transaction === 'string', 'Response has transaction (base64 string)');
  assert(response.transaction.length > 0, 'Transaction is non-empty');
  assert(typeof response.orderId === 'string', 'Response has orderId (string)');
  assert(typeof response.isToken2022 === 'boolean', 'Response has isToken2022 (boolean)');
  assert(typeof response.accounting === 'object', 'Response has accounting object');
  assert(typeof response.accounting.x402Fee.amountUsd === 'number', 'accounting.x402Fee.amountUsd is a number');
  assert(typeof response.accounting.gasReimbursement.amountRaw === 'string', 'accounting.gasReimbursement.amountRaw is a string');
  assert(typeof response.accounting.gasReimbursement.amountFormatted === 'string', 'accounting.gasReimbursement.amountFormatted is a string');
  assert(typeof response.accounting.bridgeFee.estimatedUsd === 'number', 'accounting.bridgeFee.estimatedUsd is a number');

  console.log(`\n  Order ID: ${response.orderId}`);
  console.log(`  x402 Fee: $${response.accounting.x402Fee.amountUsd}`);
  console.log(`  Gas Reimbursement: ${response.accounting.gasReimbursement.amountFormatted}`);
  console.log(`  Transaction size: ${response.transaction.length} base64 chars`);

  return { transaction: response.transaction, orderId: response.orderId };
}

// ─── Section 4: Status ───────────────────────────────────────────────────────

async function testStatus(orderId: string): Promise<void> {
  section('Section 4 — Status check (free)');

  const response = await apiGet<any>(`/api/swap/${orderId}/status`);

  const id = response.swapId ?? response.orderId;
  assert(typeof id === 'string', 'Status has swapId or orderId');
  assert(typeof response.status === 'string', 'Status has status field');
  assert(typeof response.sourceChainId === 'string', 'Status has sourceChainId');
  assert(typeof response.destinationChainId === 'string', 'Status has destinationChainId');
  assert(typeof response.sourceAmount === 'string', 'Status has sourceAmount');
  assert(typeof response.destinationAmount === 'string', 'Status has destinationAmount');

  const validStatuses = ['pending', 'created', 'bridging', 'settling', 'fulfilled', 'completed', 'failed', 'cancelled'];
  assert(validStatuses.includes(response.status), `Status "${response.status}" is a known value`);

  console.log(`\n  Order: ${id}`);
  console.log(`  Status: ${response.status}`);
}

// ─── Section 5: Sign & Submit ────────────────────────────────────────────────

async function testSignAndSubmit(transaction: string, orderId: string): Promise<void> {
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
  console.log(`\n  Polling status for order ${orderId}...`);
  const terminal = ['fulfilled', 'completed', 'failed', 'cancelled'];
  let finalStatus: string = 'pending';
  const timeout = Date.now() + 300_000; // 5 min

  while (Date.now() < timeout) {
    const status = await apiGet<any>(`/api/swap/${orderId}/status`);
    finalStatus = status.status;
    console.log(`  Status: ${finalStatus}`);
    if (terminal.includes(finalStatus)) break;
    await new Promise((r) => setTimeout(r, 3000));
  }

  assert(
    finalStatus === 'fulfilled' || finalStatus === 'completed',
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
    await testQuote();

    const executeResult = await testExecute();

    if (executeResult) {
      await testStatus(executeResult.orderId);
      await testSignAndSubmit(executeResult.transaction, executeResult.orderId);
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
