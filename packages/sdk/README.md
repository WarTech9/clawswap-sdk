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
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

// 1. Set up x402 payment
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const client = new x402Client();
registerExactEvmScheme(client, { signer: account });
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// 2. Create ClawSwap client
const clawswap = new ClawSwapClient({
  fetch: fetchWithPayment
});

// 3. Get a quote
const quote = await clawswap.getQuote({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});

console.log(`Quote: ${quote.destinationAmount} tokens`);
console.log(`Fee: $${quote.fees.totalFeeUsd}`);
console.log(`Expires in: ${quote.expiresIn}s`);

// 4. Get token info for decimals
const sourceToken = await clawswap.getTokenInfo('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// 5. Execute swap (requires $0.50 USDC payment)
const swap = await clawswap.executeSwap({
  quote: quote,
  userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  sourceTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  sourceTokenDecimals: sourceToken.decimals,
});

console.log(`Swap initiated: ${swap.swapId}`);
console.log(`Status: ${swap.status}`);

// 6. Wait for completion
const result = await clawswap.waitForSettlement(swap.swapId, {
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

##### `executeSwap(request: SwapRequest): Promise<SwapResponse>`

Execute a cross-chain swap using a quote. **Requires $0.50 USDC payment via x402**.

```typescript
// First get a quote
const quote = await client.getQuote({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});

// Get token info for decimals
const sourceToken = await client.getTokenInfo('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Then execute the swap
const swap = await client.executeSwap({
  quote: quote,
  userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  sourceTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  sourceTokenDecimals: sourceToken.decimals,
});
```

##### `getStatus(swapId: string): Promise<StatusResponse>`

Check the status of a swap. **Free endpoint**.

```typescript
const status = await client.getStatus('swap-123');
console.log(status.status); // 'pending' | 'bridging' | 'completed' etc.
```

##### `waitForSettlement(swapId: string, options?): Promise<StatusResponse>`

Poll until swap reaches a terminal state (completed/failed/expired).

```typescript
const result = await client.waitForSettlement('swap-123', {
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

Get all valid cross-chain swap pairs. Derives pairs from chains and tokens.

```typescript
const pairs = await client.getSupportedPairs();
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

Quotes expire in **30 seconds**. The SDK includes `expiresIn` and `expiresAt` fields:

```typescript
const quote = await client.getQuote(request);
console.log(`Expires in ${quote.expiresIn} seconds`);

// Set a timer to warn before expiry
setTimeout(() => {
  console.warn('Quote expiring soon!');
}, (quote.expiresIn - 5) * 1000);

// Get token info and execute within 30 seconds
const sourceToken = await client.getTokenInfo(request.sourceChainId, request.sourceTokenAddress);
await client.executeSwap({
  quote: quote,
  userWallet: request.senderAddress,
  sourceTokenMint: request.sourceTokenAddress,
  sourceTokenDecimals: sourceToken.decimals,
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
