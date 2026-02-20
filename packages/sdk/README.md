# @clawswap/sdk

Framework-agnostic TypeScript SDK for bidirectional Solana ↔ Base cross-chain token swaps.

## Prerequisites

To use the ClawSwap SDK, you need:

- **Node.js** >= 18.0.0
- **For Solana → Base**: Solana wallet (base58 private key), 0.5 USDC (swap fee), ~0.01 SOL (gas)
- **For Base → Solana**: EVM wallet (0x-prefixed hex private key), USDC on Base, ~$0.001 ETH on Base (gas)

See the [main README](../../README.md#prerequisites) for detailed wallet setup instructions.

## Installation

```bash
npm install @clawswap/sdk
```

## Setup

### 1. Install Dependencies

```bash
# For Solana → Base (x402 payment + Solana signing)
npm install @clawswap/sdk @x402/fetch @x402/core @x402/svm @solana/signers @solana/web3.js bs58

# For Base → Solana (EVM signing only, no x402 needed)
npm install @clawswap/sdk viem
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
# For Solana → Base swaps
SOLANA_PRIVATE_KEY=your_base58_key_here

# For Base → Solana swaps
EVM_PRIVATE_KEY=0xyour_hex_private_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_PRIVATE_KEY` | For Solana → Base | Base58-encoded Solana private key |
| `EVM_PRIVATE_KEY` | For Base → Solana | 0x-prefixed hex EVM private key |

**Security:** Add `.env` to `.gitignore`.

### 3. Fund Your Wallet

**Solana → Base:** 0.5 USDC + ~0.01 SOL on Solana
**Base → Solana:** USDC + small ETH (~$0.001) on Base

## Quick Start

### Solana → Base (Gas-free, $0.50 USDC x402 fee)

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { registerExactSvmScheme } from '@x402/svm/exact/client';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { Connection, Transaction, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import 'dotenv/config';

// 1. Setup x402 payment (Solana-source swaps require $0.50 USDC fee)
const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY!);
const signer = await createKeyPairSignerFromBytes(secretKey);
const x402 = new x402Client();
registerExactSvmScheme(x402, {
  signer,
  networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  x402Versions: [2, 1],
});
const fetchWithPayment = wrapFetchWithPayment(fetch, x402);
const client = new ClawSwapClient({ fetch: fetchWithPayment });

// 2. Execute swap
const swap = await client.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000', // 1 USDC (6 decimals)
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
});

// 3. Sign and submit (Solana source returns base64 string)
const connection = new Connection('https://api.mainnet-beta.solana.com');
const tx = Transaction.from(Buffer.from(swap.transaction as string, 'base64'));
const keypair = Keypair.fromSecretKey(secretKey);
tx.partialSign(keypair);
const signature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(signature);

// 4. Wait for completion
const result = await client.waitForSettlement(swap.orderId);
console.log(`Swap ${result.status}!`);
```

### Base → Solana (Caller pays gas, no x402 payment)

```typescript
import { ClawSwapClient, isEvmSource } from '@clawswap/sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import 'dotenv/config';

// 1. No x402 setup needed for Base-source swaps
const client = new ClawSwapClient();

// 2. Execute swap
const swap = await client.executeSwap({
  sourceChainId: 'base',
  sourceTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  destinationChainId: 'solana',
  destinationTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: '1000000',
  senderAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  recipientAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
});

// 3. Sign and submit (Base source returns ordered transactions array)
if (isEvmSource(swap)) {
  const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY! as `0x${string}`);
  const wallet = createWalletClient({ account, chain: base, transport: http() });
  const publicClient = createPublicClient({ chain: base, transport: http() });

  for (const tx of swap.transactions!) {
    const txHash = await wallet.sendTransaction({
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: BigInt(tx.value),
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Transaction: https://basescan.org/tx/${txHash}`);
  }
}

// 4. Wait for completion
const result = await client.waitForSettlement(swap.orderId);
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
- **Solana → Base**: $0.50 USDC fee (server sponsors gas)
- **Base → Solana**: Free (agent pays ~$0.001 Base gas directly)
- **Perfect for AI Agents**: Autonomous payment without managing API keys

x402 is only required for Solana-source swaps. When you wrap your fetch with `wrapFetchWithPayment(fetch, x402)`, it automatically handles payment for the `/api/swap/execute` endpoint. Base-source swaps use plain `fetch` with no payment.

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

Execute a cross-chain swap. Solana-source swaps require $0.50 USDC via x402. Base-source swaps are free.

Accepts the same parameters as `getQuote()`. The API fetches a fresh quote internally, so no quote expiry issues.

Returns transaction data that must be signed and submitted:
- **Solana source**: `transaction` is a base64 string → deserialize, sign, submit to Solana RPC
- **Base source**: `transactions` is an ordered array of `EvmTransaction` objects → execute sequentially with viem/ethers

```typescript
import { isEvmSource, isSolanaSource } from '@clawswap/sdk';

const response = await client.executeSwap({ /* ... */ });

if (isEvmSource(response)) {
  // Base source → execute transactions in order (approve, then bridge)
  for (const tx of response.transactions!) {
    // sign with viem and submit to Base
  }
} else if (isSolanaSource(response)) {
  // Solana source → deserialize base64, sign, submit to Solana
}

console.log(response.orderId); // Use for status tracking
```

##### `getStatus(orderId: string): Promise<StatusResponse>`

Check the status of a swap using the order ID. **Free endpoint**.

```typescript
// Use orderId from executeSwap response
const status = await client.getStatus(executeResponse.orderId);
console.log(status.status); // 'pending' | 'created' | 'fulfilled' | 'completed' | 'failed' | 'cancelled'
```

##### `waitForSettlement(orderId: string, options?): Promise<StatusResponse>`

Poll until swap reaches a terminal state (fulfilled/completed/failed/cancelled).

```typescript
// Use orderId from executeSwap response
const result = await client.waitForSettlement(executeResponse.orderId, {
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

// Solana-source executeSwap requires x402-wrapped fetch (PaymentRequiredError otherwise)
// Base-source executeSwap works with plain fetch (no x402 payment needed)
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
