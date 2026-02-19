# ClawSwap SDK

[![npm version](https://img.shields.io/npm/v/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dw/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk)

Gasless cross-chain token swaps for AI agents via x402 micropayments. **$0.50 flat fee, no API key, no gas.**

> **Phase 1: Solana → Base** ✅ Live
> **Phase 2: Base → Solana** 🚀 Shipping in days

## Quick Start

```bash
npm install @clawswap/sdk @x402/fetch
```

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';

// Setup x402 payment (see Complete Example for full x402 setup)
const x402 = new x402Client();
// ... configure x402 with your Solana wallet (see Complete Example)
const fetchWithPayment = wrapFetchWithPayment(fetch, x402);
const client = new ClawSwapClient({ fetch: fetchWithPayment });

// Swap 1 USDC from Solana to Base
const swap = await client.executeSwap({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  amount: '1000000', // 1 USDC (6 decimals)
  senderAddress: 'your-solana-address',
  recipientAddress: '0x-your-base-address',
});

// Sign and submit the transaction (see Complete Example for details)
// ... sign tx with your wallet and submit to Solana

// Wait for completion
const result = await client.waitForSettlement(swap.orderId);
console.log(`Swap ${result.status}!`);
```

## Supported Frameworks

| Framework | Package | Status |
|-----------|---------|--------|
| **Raw SDK** | `@clawswap/sdk` | ✅ Production |
| **GOAT SDK** | `@clawswap/goat-plugin` | ✅ Production |
| **ElizaOS** | REST API compatible | ✅ Works out-of-box |
| **AgentKit** | `@clawswap/agentkit-plugin` | 🔜 Coming soon |
| **Any framework** | Works with `@x402/fetch` | ✅ Universal |

### GOAT Plugin

```bash
npm install @clawswap/goat-plugin @goat-sdk/core
```

```typescript
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai';
import { viem } from '@goat-sdk/wallet-viem';
import { clawSwap } from '@clawswap/goat-plugin';

const tools = await getOnChainTools({
  wallet: viem(walletClient),
  plugins: [clawSwap()],
});

// Use with Vercel AI, LangChain, or any GOAT-compatible framework
```

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
| [@clawswap/goat-plugin](./packages/goat-plugin) | GOAT SDK integration | [![npm](https://img.shields.io/npm/v/@clawswap/goat-plugin)](https://www.npmjs.com/package/@clawswap/goat-plugin) |
| [@clawswap/agentkit-plugin](./packages/agentkit-plugin) | Coinbase AgentKit integration | 🔜 Coming soon |

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
const secretKey = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
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
const tx = Transaction.from(Buffer.from(swap.transaction, 'base64'));
const keypair = Keypair.fromSecretKey(secretKey);
tx.partialSign(keypair);

const connection = new Connection('https://api.mainnet-beta.solana.com');
const signature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(signature);

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
- [GOAT Plugin Documentation](./packages/goat-plugin/README.md)
- [Implementation Plan](./docs/implementation-plan.md)

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
