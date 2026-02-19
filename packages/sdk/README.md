# @clawswap/sdk

Framework-agnostic TypeScript SDK for ClawSwap cross-chain token swaps.

## Installation

```bash
npm install @clawswap/sdk @x402/fetch
# or
pnpm add @clawswap/sdk @x402/fetch
```

## Quick Start

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { registerExactSvmScheme } from '@x402/svm/exact/client';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// 1. Set up x402 payment on Solana
const keypair = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY!));
const client = new x402Client();
registerExactSvmScheme(client, {
  signer: keypair,
  network: 'solana:mainnet'
});
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// 2. Create ClawSwap client
const clawswap = new ClawSwapClient({
  fetch: fetchWithPayment
});

// 3. Optional: Get a quote for preview
const quote = await clawswap.getQuote({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});

console.log(`You will receive: ${quote.destinationAmount} tokens`);
console.log(`Fee: $${quote.fees.totalFeeUsd}`);

// 4. Execute swap (requires $0.50 USDC payment)
// Can skip getQuote() and execute directly - API fetches fresh quote internally
const executeResponse = await clawswap.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});

console.log(`Transaction received: ${executeResponse.transaction.slice(0, 20)}...`);
console.log(`Order ID: ${executeResponse.metadata.orderId}`);

// 5. Sign and submit transaction
// ... decode, sign, submit to Solana RPC ...

// 6. Wait for completion using order ID from execute response
const result = await clawswap.waitForSettlement(executeResponse.metadata.orderId, {
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
