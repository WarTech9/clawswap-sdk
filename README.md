# ClawSwap SDK

[![npm version](https://img.shields.io/npm/v/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dw/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk)

Gasless cross-chain token swaps for AI agents via x402 micropayments. **$0.50 flat fee, no API key, no gas.**

> **Phase 1: Solana → Base** ✅ Live
> **Phase 2: Base → Solana** 🚀 Shipping in days

## What is x402?

x402 is a micropayment protocol that lets you pay for API calls with crypto instead of API keys. When you use ClawSwap:
- Your wallet automatically pays $0.50 USDC per swap
- No need to manage API keys or subscriptions
- Pay-per-use model perfect for AI agents

Learn more: [x402.org](https://x402.org)

## Prerequisites

Before using ClawSwap, you need:

- **Node.js** >= 18.0.0
- **Package Manager**: npm, pnpm, or yarn
- **Solana Wallet** with:
  - Private key (base58-encoded)
  - Minimum 0.5 USDC (for $0.50 swap fee)
  - ~0.01 SOL (for transaction gas)

<details>
<summary>Getting a Solana Wallet</summary>

**Option 1: Use an Existing Wallet**
- Export your private key from Phantom, Solflare, or other wallet apps
- Look for "Export Private Key" in wallet settings
- Copy the base58-encoded string (starts with letters/numbers, NOT 0x)

**Option 2: Create New Wallet via CLI**
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate new keypair
solana-keygen new --outfile ~/clawswap-wallet.json
```

**Funding Your Wallet:**
1. Get your wallet address: `solana-keygen pubkey ~/clawswap-wallet.json`
2. Send USDC and SOL to this address from an exchange or another wallet
3. Verify balance: `solana balance <your-address>`

</details>

## Setup

### 1. Install Dependencies

```bash
npm install @clawswap/sdk @x402/fetch @x402/core @x402/svm @solana/signers @solana/web3.js bs58
# or
pnpm add @clawswap/sdk @x402/fetch @x402/core @x402/svm @solana/signers @solana/web3.js bs58
```

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Required for swap execution
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Yes | Base58-encoded Solana private key |
| `CLAWSWAP_API_URL` | No | Override API endpoint (default: https://api.clawswap.dev) |

### 3. Load Environment Variables

```typescript
import 'dotenv/config';
```

**Security Note:** Never commit your `.env` file. Add it to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Quick Start

Once you've completed the [Setup](#setup), here's a minimal working example:

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { registerExactSvmScheme } from '@x402/svm/exact/client';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { Connection, Transaction, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import 'dotenv/config';

// 1. Setup x402 payment wrapper (reads SOLANA_PRIVATE_KEY from .env)
const x402 = new x402Client();
const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY!);
const signer = await createKeyPairSignerFromBytes(secretKey);

registerExactSvmScheme(x402, {
  signer,
  networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  x402Versions: [2, 1],
});

const fetchWithPayment = wrapFetchWithPayment(fetch, x402);
const client = new ClawSwapClient({ fetch: fetchWithPayment });

// 2. Execute swap (pays $0.50 USDC via x402)
const swap = await client.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  amount: '1000000', // 1 USDC (6 decimals)
  senderAddress: 'your-solana-address',
  recipientAddress: '0x-your-base-address',
});

// 3. Sign and submit transaction to Solana
const connection = new Connection('https://api.mainnet-beta.solana.com');
const tx = Transaction.from(Buffer.from(swap.transaction, 'base64'));
const keypair = Keypair.fromSecretKey(secretKey);
tx.partialSign(keypair);

const signature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(signature);

// 4. Wait for completion
const result = await client.waitForSettlement(swap.orderId);
console.log(`Swap ${result.status}!`);
```

## Supported Frameworks

| Framework | Package | Status |
|-----------|---------|--------|
| **Raw SDK** | `@clawswap/sdk` | ✅ Production |
| **GOAT SDK** | `@clawswap/goat-plugin` | 🔜 Coming soon |
| **ElizaOS** | REST API compatible | ✅ Works out-of-box |
| **AgentKit** | `@clawswap/agentkit-plugin` | 🔜 Coming soon |
| **Any framework** | Works with `@x402/fetch` | ✅ Universal |

### ElizaOS Integration

ClawSwap works with ElizaOS through direct REST API calls or the raw SDK. No plugin needed.

```typescript
// ElizaOS agents can use the core SDK directly
import { ClawSwapClient } from '@clawswap/sdk';
// ... same as Quick Start above
```

## Features

- ✅ **Type-safe** - Complete TypeScript interfaces
- ✅ **x402 Compatible** - Automatic payment handling
- ✅ **Framework Agnostic** - Works with any agent framework
- ✅ **Status Polling** - Built-in polling for swap completion
- ✅ **Typed Errors** - Specific error classes for each failure type
- ✅ **Multi-chain** - Solana ↔ Base (Base → Solana shipping soon)

## Packages

| Package | Description | NPM |
|---------|-------------|-----|
| [@clawswap/sdk](./packages/sdk) | Core framework-agnostic SDK | [![npm](https://img.shields.io/npm/v/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk) |

## Why ClawSwap?

**For AI Agents:**
- No API keys to manage
- No gas tokens needed
- Pay-per-use via x402 ($0.50 flat fee)
- Simple TypeScript API
- Works with any framework

**Traditional bridges require:**
- Managing gas tokens on source chain
- Complex approval + bridge transactions
- API keys and rate limits
- Custom integration per bridge

**ClawSwap simplifies to:**
- One SDK call
- Automatic payment via x402
- No gas, no keys, no hassle

## Complete Example

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { registerExactSvmScheme } from '@x402/svm/exact/client';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import bs58 from 'bs58';

// 1. Setup x402 payment on Solana
const x402 = new x402Client();
const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY); // From .env file (see Setup)
const signer = await createKeyPairSignerFromBytes(secretKey);

registerExactSvmScheme(x402, {
  signer,
  networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
  x402Versions: [2, 1],
});

const fetchWithPayment = wrapFetchWithPayment(fetch, x402);

// 2. Create ClawSwap client
const client = new ClawSwapClient({ fetch: fetchWithPayment });

// 3. Execute swap (optional: call getQuote first for preview)
const swap = await client.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000', // 1 USDC (6 decimals)
  senderAddress: 'your-solana-address',
  recipientAddress: '0x-your-base-address',
});

// 4. Sign and submit the transaction to Solana
const { Connection, Transaction, Keypair } = await import('@solana/web3.js');
const connection = new Connection('https://api.mainnet-beta.solana.com');
const tx = Transaction.from(Buffer.from(swap.transaction, 'base64'));
const keypair = Keypair.fromSecretKey(secretKey);
tx.partialSign(keypair);

const signature = await connection.sendRawTransaction(tx.serialize(), {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
});

await connection.confirmTransaction(signature, 'confirmed');
console.log(`Transaction: ${signature}`);

// 5. Wait for swap to complete
const result = await client.waitForSettlement(swap.orderId, {
  timeout: 300_000, // 5 minutes
  interval: 3000, // Poll every 3s
  onStatusUpdate: (status) => console.log(`Status: ${status.status}`),
});

console.log(`Swap completed: ${result.destinationAmount} tokens delivered`);
```

## API Endpoints

ClawSwap API: `https://api.clawswap.dev`

- `GET /api/chains` - List supported chains (free)
- `GET /api/tokens/:chain` - List tokens for a chain (free)
- `POST /api/swap/quote` - Get swap quote (free)
- `POST /api/swap/execute` - Execute swap ($0.50 USDC via x402)
- `GET /api/swap/:id/status` - Check swap status (free)

## Documentation

- [Core SDK Documentation](./packages/sdk/README.md)

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode (watch)
pnpm dev
```

## License

MIT

## Support

- [GitHub Issues](https://github.com/WarTech9/clawswap-sdk/issues)
- [Documentation](https://clawswap.dev/docs)
- [X](https://x.com/clawswap_dev)
