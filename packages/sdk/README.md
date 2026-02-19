# @clawswap/sdk

Framework-agnostic TypeScript SDK for ClawSwap cross-chain token swaps.

## Prerequisites

To use the ClawSwap SDK, you need:

- **Node.js** >= 18.0.0
- **Solana Wallet** (for executing swaps):
  - Base58-encoded private key
  - Minimum 0.5 USDC (for swap fee)
  - ~0.01 SOL (for gas)

See the [main README](../../README.md#prerequisites) for detailed wallet setup instructions.

## Installation

```bash
npm install @clawswap/sdk @x402/fetch
# or
pnpm add @clawswap/sdk @x402/fetch
```

## Setup

### 1. Install All Required Dependencies

```bash
npm install @clawswap/sdk @x402/fetch @x402/core @x402/svm @solana/signers @solana/web3.js bs58
# or
pnpm add @clawswap/sdk @x402/fetch @x402/core @x402/svm @solana/signers @solana/web3.js bs58
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
# Required - your Solana wallet's base58-encoded private key
SOLANA_PRIVATE_KEY=your_base58_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Yes (for swaps) | Base58-encoded Solana private key. Get from Phantom/Solflare export or `solana-keygen new`. |

**How to get your private key:**
- **Phantom/Solflare**: Settings → Export Private Key
- **CLI**: `solana-keygen new --outfile wallet.json`

**Security:** Add `.env` to `.gitignore`.

### 3. Fund Your Wallet

Your Solana wallet needs:
- **0.5 USDC** (covers $0.50 swap fee)
- **~0.01 SOL** (covers transaction gas)

## Quick Start

**Complete working example** (requires [Setup](#setup)):

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { registerExactSvmScheme } from '@x402/svm/exact/client';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { Connection, Transaction, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import 'dotenv/config'; // Load .env file

// 1. Setup x402 payment (reads SOLANA_PRIVATE_KEY from .env)
const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY!);
const signer = await createKeyPairSignerFromBytes(secretKey);

const x402 = new x402Client();
registerExactSvmScheme(x402, {
  signer,
  networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'], // Solana mainnet
  x402Versions: [2, 1],
});

const fetchWithPayment = wrapFetchWithPayment(fetch, x402);

// 2. Create ClawSwap client
const clawswap = new ClawSwapClient({ fetch: fetchWithPayment });

// 3. Optional: Preview quote (free endpoint)
const quote = await clawswap.getQuote({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  amount: '1000000', // 1 USDC (6 decimals)
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});

console.log(`You will receive: ${quote.destinationAmount} tokens`);
console.log(`Fee: $${quote.fees.totalFeeUsd}`);

// 4. Execute swap (requires $0.50 USDC payment via x402)
const executeResponse = await clawswap.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});

console.log(`Order ID: ${executeResponse.orderId}`);

// 5. Sign and submit transaction
const connection = new Connection('https://api.mainnet-beta.solana.com');
const tx = Transaction.from(Buffer.from(executeResponse.transaction, 'base64'));
const keypair = Keypair.fromSecretKey(secretKey);
tx.partialSign(keypair);

const signature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(signature);
console.log(`Transaction: ${signature}`);

// 6. Wait for swap completion
const result = await clawswap.waitForSettlement(executeResponse.orderId, {
  onStatusUpdate: (status) => console.log(`Status: ${status.status}`),
});

console.log(`Swap ${result.status}!`);
```

## Features

- ✅ **Type-safe** - Complete TypeScript interfaces for all endpoints
- ✅ **x402 Compatible** - Accepts x402-wrapped fetch for automatic payment handling
- ✅ **Status Polling** - `waitForSettlement()` polls until swap completes
- ✅ **Typed Errors** - Specific error classes for each failure type
- ✅ **Quote Expiry Tracking** - `expiresIn` field shows seconds until quote expires
- ✅ **Discovery Helpers** - Methods to get supported chains, tokens, and pairs
- ✅ **Framework Agnostic** - Works with any fetch implementation

## What is x402?

x402 is a micropayment protocol that enables pay-per-use API access with cryptocurrency:

- **No API Keys**: Your wallet automatically pays for each API call
- **Micropayments**: Pay exactly $0.50 USDC per swap, nothing more
- **Perfect for AI Agents**: Autonomous payment without managing API keys

When you wrap your fetch with `wrapFetchWithPayment(fetch, x402)`, the SDK automatically:
1. Detects paid endpoints (like `/api/swap/execute`)
2. Creates a micro-payment transaction
3. Attaches payment proof to the request
4. Submits to ClawSwap API

Learn more at [x402.org](https://x402.org)

## API Reference

### `ClawSwapClient`

#### Constructor

```typescript
new ClawSwapClient(config?: ClawSwapConfig)
```

**Config Options:**
- `baseUrl?` - API base URL (default: `https://api.clawswap.dev`)
- `fetch?` - Custom fetch implementation (default: `globalThis.fetch`)
- `timeout?` - Request timeout in ms (default: `30000`)
- `headers?` - Custom headers for all requests

#### Methods

##### `getQuote(request: QuoteRequest): Promise<QuoteResponse>`

Get a quote for a cross-chain swap. **Free endpoint**.

```typescript
const quote = await client.getQuote({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000', // 1 USDC (6 decimals)
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  slippageTolerance: 0.01, // Optional, 1%
});
```

##### `executeSwap(request: QuoteRequest): Promise<ExecuteSwapResponse>`

Execute a cross-chain swap. **Requires $0.50 USDC payment via x402 on Solana**.

Accepts the same parameters as `getQuote()`. The API fetches a fresh quote internally, so no quote expiry issues.

Returns a partially-signed transaction that must be signed by the user and submitted to Solana RPC.

```typescript
// Execute swap directly (no need to call getQuote first)
const executeResponse = await client.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  slippageTolerance: 0.01, // Optional
});

// Response includes transaction to sign and orderId for tracking
console.log(executeResponse.transaction); // Base64-encoded transaction
console.log(executeResponse.metadata.orderId); // Use for status tracking
```

##### `getStatus(orderId: string): Promise<StatusResponse>`

Check the status of a swap using the order ID. **Free endpoint**.

```typescript
// Use orderId from executeSwap response
const status = await client.getStatus(executeResponse.metadata.orderId);
console.log(status.status); // 'pending' | 'created' | 'fulfilled' | 'completed' | 'failed' | 'cancelled'
```

##### `waitForSettlement(orderId: string, options?): Promise<StatusResponse>`

Poll until swap reaches a terminal state (fulfilled/completed/failed/cancelled).

```typescript
// Use orderId from executeSwap response
const result = await client.waitForSettlement(executeResponse.metadata.orderId, {
  timeout: 300000, // 5 minutes (default)
  interval: 3000,  // Poll every 3 seconds (default)
  onStatusUpdate: (status) => {
    console.log(`Current status: ${status.status}`);
  },
});
```

##### `getSupportedChains(): Promise<Chain[]>`

Get list of supported blockchains. **Free endpoint, cached 1 hour**.

```typescript
const chains = await client.getSupportedChains();
```

##### `getSupportedTokens(chainId: string): Promise<Token[]>`

Get tokens supported on a specific chain. **Free endpoint, cached 1 hour**.

```typescript
const tokens = await client.getSupportedTokens('solana');
```

##### `getSupportedPairs(): Promise<TokenPair[]>`

Get all valid cross-chain swap pairs. Derives pairs from chains and tokens. **Results are cached for 1 hour**.

```typescript
const pairs = await client.getSupportedPairs();
// Returns array of { sourceChain, sourceToken, destinationChain, destinationToken }
```

## Error Handling

The SDK throws typed errors for specific failure scenarios:

```typescript
import {
  ClawSwapError,
  InsufficientLiquidityError,
  QuoteExpiredError,
  PaymentRequiredError
} from '@clawswap/sdk';

try {
  await client.executeSwap(request);
} catch (error) {
  if (error instanceof InsufficientLiquidityError) {
    console.error('Not enough liquidity:', error.details);
  } else if (error instanceof QuoteExpiredError) {
    console.error('Quote expired, get a new one');
  } else if (error instanceof PaymentRequiredError) {
    console.error('Payment failed:', error.message);
  } else if (error instanceof ClawSwapError) {
    console.error(`Error ${error.code}:`, error.message);
  }
}
```

**Available Error Classes:**
- `InsufficientLiquidityError` - Not enough liquidity for swap
- `AmountTooLowError` / `AmountTooHighError` - Amount outside limits
- `UnsupportedPairError` - Token pair not supported
- `QuoteExpiredError` - Quote expired (30s TTL)
- `PaymentRequiredError` / `PaymentVerificationError` - x402 payment issues
- `NetworkError` - Network request failed
- `TimeoutError` - Request or polling timed out

## Quote Expiry

When using `getQuote()` for preview, quotes expire in **30 seconds**. The SDK includes `expiresIn` and `expiresAt` fields:

```typescript
const quote = await client.getQuote(request);
console.log(`Quote expires in ${quote.expiresIn} seconds`);
console.log(`Estimated output: ${quote.destinationAmount} tokens`);
```

**Note:** Quote expiry is NOT an issue when executing swaps. The `executeSwap()` method fetches a fresh quote internally, so you don't need to worry about timing:

```typescript
// No quote expiry issues - API fetches fresh quote
const executeResponse = await client.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});
```

## Usage Without x402

The SDK works with standard fetch too (for free endpoints):

```typescript
const client = new ClawSwapClient(); // Uses global fetch

// Free endpoints work without x402
const chains = await client.getSupportedChains();
const tokens = await client.getSupportedTokens('solana');
const quote = await client.getQuote(request);

// executeSwap will fail with PaymentRequiredError if fetch isn't x402-wrapped
```

## TypeScript

The SDK is written in TypeScript with full type definitions included.

```typescript
import type { QuoteResponse, SwapStatus } from '@clawswap/sdk';

const quote: QuoteResponse = await client.getQuote(request);
const status: SwapStatus = 'completed';
```

## License

MIT
