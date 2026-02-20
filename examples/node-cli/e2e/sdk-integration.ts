/**
 * E2E Tests: SDK Integration
 *
 * Tests the complete payment flow through the ClawSwapClient.
 * Validates that the SDK correctly wraps the API and that all
 * methods work end-to-end with real x402 payments.
 *
 * Usage:
 *   # Free sections only (no private key needed):
 *   npx tsx e2e/sdk-integration.ts
 *
 *   # With x402 payment (deducts $0.50 USDC from Solana wallet):
 *   SOLANA_PRIVATE_KEY=<base58-key> npx tsx e2e/sdk-integration.ts
 *
 *   # Skip Solana transaction submission (sections 1-4 only):
 *   SOLANA_PRIVATE_KEY=<base58-key> SKIP_SUBMIT=true npx tsx e2e/sdk-integration.ts
 *
 * Environment Variables:
 *   SOLANA_PRIVATE_KEY    Base58-encoded Solana private key (required for sections 3-5)
 *   RECIPIENT_ADDRESS     EVM address to receive funds (default: test address)
 *   SKIP_SUBMIT           Set to "true" to skip transaction submission (section 5)
 *   CLAWSWAP_API_URL      Override API base URL
 */

import dotenv from 'dotenv';
import { ClawSwapClient } from '@clawswap/sdk';
import type { QuoteResponse, ExecuteSwapResponse, StatusResponse, SwapFeeBreakdown, Chain, Token } from '@clawswap/sdk';

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

// ─── Section 1: Discovery ────────────────────────────────────────────────────

async function testDiscovery(client: ClawSwapClient): Promise<void> {
  section('Section 1 — Discovery (free, no payment)');

  const chains: Chain[] = await client.getSupportedChains();
  assert(Array.isArray(chains), 'getSupportedChains() returns array');
  assert(chains.length > 0, 'At least one chain returned');

  const solana = chains.find((c) => c.id === 'solana');
  assert(solana !== undefined, 'Solana chain present');
  assert(solana?.name === 'Solana', 'Solana chain name is "Solana"');
  assert(typeof solana?.nativeCurrency.symbol === 'string', 'Solana nativeCurrency.symbol is string');

  const base = chains.find((c) => c.id === 'base');
  assert(base !== undefined, 'Base chain present');

  const solanaTokens: Token[] = await client.getSupportedTokens('solana');
  assert(Array.isArray(solanaTokens), 'getSupportedTokens("solana") returns array');
  assert(solanaTokens.length > 0, 'At least one Solana token');

  const solanaUsdc = solanaTokens.find((t) => t.symbol === 'USDC');
  assert(solanaUsdc !== undefined, 'Solana USDC found');
  assert(solanaUsdc?.address === SOLANA_USDC, 'Solana USDC address matches');
  assert(solanaUsdc?.decimals === 6, 'Solana USDC has 6 decimals');
  assert(solanaUsdc?.chainId === 'solana', 'Solana USDC chainId is "solana"');

  const baseTokens: Token[] = await client.getSupportedTokens('base');
  assert(Array.isArray(baseTokens), 'getSupportedTokens("base") returns array');

  const baseUsdc = baseTokens.find((t) => t.symbol === 'USDC');
  assert(baseUsdc !== undefined, 'Base USDC found');
  assert(baseUsdc?.chainId === 'base', 'Base USDC chainId is "base"');

  const fee: SwapFeeBreakdown = await client.getSwapFee();
  assert(typeof fee.x402Fee === 'object', 'getSwapFee() returns x402Fee object');
  assert(typeof fee.x402Fee.amountUsd === 'number', 'x402Fee.amountUsd is a number');
  assert(typeof fee.x402Fee.currency === 'string', 'x402Fee.currency is a string');
  assert(typeof fee.gasReimbursement === 'object', 'getSwapFee() returns gasReimbursement object');
  assert(typeof fee.bridgeFee === 'object', 'getSwapFee() returns bridgeFee object');
  assert(typeof fee.note === 'string', 'getSwapFee() returns note (string)');

  console.log(`\n  Chains: ${chains.map((c) => c.id).join(', ')}`);
  console.log(`  Solana tokens: ${solanaTokens.length}`);
  console.log(`  Base tokens: ${baseTokens.length}`);
  console.log(`  x402 fee: $${fee.x402Fee.amountUsd} ${fee.x402Fee.currency} on ${fee.x402Fee.network}`);
}

// ─── Section 2: Quote ────────────────────────────────────────────────────────

async function testQuoteForPair(
  client: ClawSwapClient,
  sourceTokenAddress: string,
  destinationTokenAddress: string,
  pairLabel: string,
): Promise<QuoteResponse> {
  section(`Section 2 — Quote: ${pairLabel} (free, no payment)`);

  const quote: QuoteResponse = await client.getQuote({
    sourceChainId: 'solana',
    sourceTokenAddress,
    destinationChainId: 'base',
    destinationTokenAddress,
    amount: SWAP_AMOUNT,
    senderAddress: TEST_SENDER,
    recipientAddress: RECIPIENT_ADDRESS,
  });

  assert(typeof quote.quoteId === 'string' && quote.quoteId.length > 0, 'Quote has quoteId');
  assert(typeof quote.sourceAmount === 'string', 'Quote has sourceAmount');
  assert(typeof quote.destinationAmount === 'string', 'Quote has destinationAmount');
  assert(typeof quote.fees === 'object', 'Quote has fees object');
  assert(typeof quote.fees.totalEstimatedFeeUsd === 'number', 'fees.totalEstimatedFeeUsd is a number');
  assert(typeof quote.fees.bridgeFeeUsd === 'number', 'fees.bridgeFeeUsd is a number');
  assert(typeof quote.fees.x402FeeUsd === 'number', 'fees.x402FeeUsd is a number');
  assert(typeof quote.fees.gasReimbursementEstimatedUsd === 'number', 'fees.gasReimbursementEstimatedUsd is a number');
  assert(typeof quote.estimatedTimeSeconds === 'number', 'Quote has estimatedTimeSeconds');
  assert(typeof quote.expiresIn === 'number', 'Quote has expiresIn');
  assert(typeof quote.expiresAt === 'string', 'Quote has expiresAt');

  const destAmount = parseFloat(quote.destinationAmount);
  assert(destAmount > Number(SWAP_AMOUNT) * 0.9, `Destination amount > 90% of input (got ${destAmount}, input ${SWAP_AMOUNT})`);
  assert(quote.fees.totalEstimatedFeeUsd > 0, `Total fee > 0 (got ${quote.fees.totalEstimatedFeeUsd})`);

  console.log(`\n  Quote ID: ${quote.quoteId}`);
  console.log(`  Destination amount: ${destAmount / 1e6}`);
  console.log(`  Total Fee: $${quote.fees.totalEstimatedFeeUsd}`);
  console.log(`  Expires in: ${quote.expiresIn}s`);

  return quote;
}

// ─── Section 3: Execute (requires SOLANA_PRIVATE_KEY) ───────────────────────

async function testExecute(): Promise<ExecuteSwapResponse | null> {
  section('Section 3 — Execute via SDK (requires x402 payment)');

  if (!SOLANA_PRIVATE_KEY) {
    console.log('  ⏭  SKIPPED — set SOLANA_PRIVATE_KEY to run this section');
    return null;
  }

  // Setup x402-wrapped fetch (same pattern as src/commands/swap.ts)
  const { x402Client } = await import('@x402/core/client');
  const { wrapFetchWithPayment } = await import('@x402/fetch');
  const { registerExactSvmScheme } = await import('@x402/svm/exact/client');
  const { createKeyPairSignerFromBytes } = await import('@solana/signers');
  const bs58 = await import('bs58');

  const x402 = new x402Client();
  const secretKey = bs58.default.decode(SOLANA_PRIVATE_KEY);
  const signer = await createKeyPairSignerFromBytes(secretKey);

  // Derive the actual wallet address from the private key
  const { Keypair } = await import('@solana/web3.js');
  const keypairForAddress = Keypair.fromSecretKey(secretKey);
  const senderAddress = keypairForAddress.publicKey.toBase58();
  console.log(`  Sender address (derived from key): ${senderAddress}`);

  registerExactSvmScheme(x402, {
    signer,
    networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    x402Versions: [2, 1],
  } as any);

  const fetchWithPayment = wrapFetchWithPayment(fetch, x402);

  // Instantiate SDK client with x402-wrapped fetch
  const client = new ClawSwapClient({
    fetch: fetchWithPayment,
    baseUrl: API_URL,
  });

  console.log('  Calling client.executeSwap() (x402 payment will be deducted)...');

  const execPairLabel = `${EXEC_SOURCE_TOKEN === SOLANA_USDC ? 'USDC' : 'USDT'} (Sol) → ${EXEC_DEST_TOKEN === BASE_USDC ? 'USDC' : 'USDT'} (Base)`;
  console.log(`  Pair: ${execPairLabel}`);

  const response: ExecuteSwapResponse = await client.executeSwap({
    sourceChainId: 'solana',
    sourceTokenAddress: EXEC_SOURCE_TOKEN,
    destinationChainId: 'base',
    destinationTokenAddress: EXEC_DEST_TOKEN,
    amount: SWAP_AMOUNT,
    senderAddress,
    recipientAddress: RECIPIENT_ADDRESS,
  });

  assert(typeof response.transaction === 'string', 'executeSwap() returns transaction (string)');
  assert(response.transaction.length > 0, 'Transaction is non-empty');
  assert(typeof response.orderId === 'string', 'executeSwap() returns orderId (string)');
  assert(typeof response.isToken2022 === 'boolean', 'executeSwap() returns isToken2022 (boolean)');
  assert(typeof response.accounting === 'object', 'executeSwap() returns accounting object');
  assert(typeof response.accounting.x402Fee.amountUsd === 'number', 'accounting.x402Fee.amountUsd is a number');
  if (response.accounting.gasReimbursement) {
    assert(typeof response.accounting.gasReimbursement.amountRaw === 'string', 'accounting.gasReimbursement.amountRaw is a string');
    assert(typeof response.accounting.gasReimbursement.amountFormatted === 'string', 'accounting.gasReimbursement.amountFormatted is a string');
  }
  assert(typeof response.accounting.bridgeFee.estimatedUsd === 'number', 'accounting.bridgeFee.estimatedUsd is a number');

  console.log(`\n  Order ID: ${response.orderId}`);
  console.log(`  x402 Fee: $${response.accounting.x402Fee.amountUsd}`);
  console.log(`  Gas Reimbursement: ${response.accounting.gasReimbursement?.amountFormatted ?? 'N/A'}`);

  return response;
}

// ─── Section 4: Status ───────────────────────────────────────────────────────

async function testStatus(client: ClawSwapClient, orderId: string): Promise<void> {
  section('Section 4 — Status via SDK (free)');

  const status: StatusResponse = await client.getStatus(orderId);

  const statusRecord = status as unknown as Record<string, unknown>;
  const id = statusRecord.swapId ?? statusRecord.orderId;
  assert(typeof id === 'string', 'getStatus() returns swapId or orderId');
  assert(typeof status.status === 'string', 'Status has status field');
  assert(typeof status.sourceChainId === 'string', 'Status has sourceChainId');
  assert(typeof status.destinationChainId === 'string', 'Status has destinationChainId');
  assert(typeof status.sourceAmount === 'string', 'Status has sourceAmount');
  assert(typeof status.destinationAmount === 'string', 'Status has destinationAmount');

  const validStatuses = ['pending', 'created', 'bridging', 'settling', 'fulfilled', 'completed', 'failed', 'cancelled'];
  assert(validStatuses.includes(status.status), `Status "${status.status}" is a known value`);

  console.log(`\n  Order: ${id}`);
  console.log(`  Status: ${status.status}`);
}

// ─── Section 5: Sign, Submit & Wait for Settlement (opt-in) ─────────────────

async function testSettlement(
  client: ClawSwapClient,
  transaction: string,
  orderId: string
): Promise<void> {
  section('Section 5 — Sign, Submit & waitForSettlement');

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

  // Sign the partially-signed transaction
  const txBuffer = Buffer.from(transaction, 'base64');
  const tx = Transaction.from(txBuffer);
  const secretKey = bs58.default.decode(SOLANA_PRIVATE_KEY);
  const keypair = Keypair.fromSecretKey(secretKey);

  console.log(`  Signing with: ${keypair.publicKey.toBase58()}`);
  tx.partialSign(keypair);
  assert(true, 'Transaction signed');

  // Submit to Solana mainnet
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  assert(typeof signature === 'string' && signature.length > 0, 'Transaction submitted');
  console.log(`  Signature: ${signature}`);
  console.log(`  Solscan: https://solscan.io/tx/${signature}`);

  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  assert(!confirmation.value.err, 'Transaction confirmed on Solana');

  // Use SDK to wait for settlement
  console.log(`\n  Calling client.waitForSettlement(${orderId})...`);
  const result = await client.waitForSettlement(orderId, {
    timeout: 300_000,
    interval: 3000,
    onStatusUpdate: (s) => {
      console.log(`  Status update: ${s.status}`);
    },
  });

  const success = result.status === 'fulfilled' || result.status === 'completed';
  assert(success, `Swap reached success state (got: ${result.status})`);

  if (success) {
    console.log(`\n  ✨ Swap completed: ${result.destinationAmount} tokens delivered`);
  }
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
  console.log('║       ClawSwap SDK Integration E2E Tests                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nAPI: ${API_URL}`);
  console.log(`Recipient: ${RECIPIENT_ADDRESS}`);
  console.log(`Sender: ${senderAddress}`);
  console.log(`Payment key: ${SOLANA_PRIVATE_KEY ? 'set ✓' : 'not set (sections 3-5 skipped)'}`);
  console.log(`Submit transaction: ${SKIP_SUBMIT ? 'skipped (SKIP_SUBMIT=true)' : 'yes (default)'}`);

  // Free client for discovery / quote / status
  const freeClient = new ClawSwapClient({ baseUrl: API_URL });

  try {
    await testDiscovery(freeClient);
    // Quote tests — free, no payment required
    await testQuoteForPair(freeClient, SOLANA_USDC, BASE_USDC, 'USDC (Sol) → USDC (Base)');
    await testQuoteForPair(freeClient, SOLANA_USDC, BASE_USDT, 'USDC (Sol) → USDT (Base)');
    await testQuoteForPair(freeClient, SOLANA_USDT, BASE_USDC, 'USDT (Sol) → USDC (Base)');

    const executeResult = await testExecute();

    if (executeResult) {
      await testStatus(freeClient, executeResult.orderId);
      await testSettlement(freeClient, executeResult.transaction, executeResult.orderId);
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
