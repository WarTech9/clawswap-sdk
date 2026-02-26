# ClawSwap SDK

[![npm version](https://img.shields.io/npm/v/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dw/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk)

Gasless cross-chain token swaps for AI agents via x402 micropayments. **No API key, no gas management.**

> **Solana ↔ Base** — Bidirectional swaps live

## What is x402?

x402 is a micropayment protocol that lets you pay for API calls with crypto instead of API keys. When you use ClawSwap:
- **Solana → Base**: $0.50 USDC service fee (server sponsors gas)
- **Base → Solana**: Free (agent pays ~$0.001 Base gas directly)
- No API keys or subscriptions
- Pay-per-use model perfect for AI agents

Learn more: [x402.org](https://x402.org)

## Prerequisites

- **Node.js** >= 18.0.0 (server-side) or **modern browser** (client-side — Chrome, Firefox, Safari, Edge)
- **Package Manager**: npm, pnpm, or yarn
- **For Solana → Base swaps**: Solana wallet with 0.5 USDC (swap fee) + ~0.01 SOL (gas)
- **For Base → Solana swaps**: EVM wallet with USDC on Base + small amount of ETH (~$0.001 gas)

> The SDK has zero Node.js dependencies and works in any environment with the Fetch API.

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
# Core SDK
npm install @clawswap/sdk

# For Solana → Base (x402 payment + Solana signing)
npm install @x402/fetch @x402/core @x402/svm @solana/signers @solana/web3.js bs58

# For Base → Solana (EVM signing)
npm install viem
```

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# For Solana → Base swaps
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key_here

# For Base → Solana swaps
EVM_PRIVATE_KEY=0xyour_hex_private_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_PRIVATE_KEY` | For Solana → Base | Base58-encoded Solana private key |
| `EVM_PRIVATE_KEY` | For Base → Solana | 0x-prefixed hex EVM private key |

### 3. Load Environment Variables

```typescript
import 'dotenv/config';
```

**Security Note:** Never commit your `.env` file. Add it to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

## Quick Start

Once you've completed the [Setup](#setup), here are working examples for both directions:

### Solana → Base (with x402 payment)

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { registerExactSvmScheme } from '@x402/svm/exact/client';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import bs58 from 'bs58';
import 'dotenv/config';

// 1. Setup x402 payment on Solana
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

// 2. Execute swap
const swap = await client.executeSwap({
  sourceChain: 'solana',
  sourceToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChain: 'base',
  destinationToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  userWallet: 'your-solana-address',
  recipient: '0x-your-base-address',
});

// 3. Sign and submit to Solana
const { Connection, Transaction, Keypair } = await import('@solana/web3.js');
const connection = new Connection('https://api.mainnet-beta.solana.com');
const tx = Transaction.from(Buffer.from(swap.transaction as string, 'base64'));
const keypair = Keypair.fromSecretKey(secretKey);
tx.partialSign(keypair);

const signature = await connection.sendRawTransaction(tx.serialize(), {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
});
await connection.confirmTransaction(signature, 'confirmed');

// 4. Wait for settlement
const result = await client.waitForSettlement(swap.requestId, {
  timeout: 300_000,
  interval: 3000,
  onStatusUpdate: (status) => console.log(`Status: ${status.status}`),
});
console.log(`Swap completed: ${result.outputAmount} tokens delivered`);
```

### Base → Solana (free, no x402)

```typescript
import { ClawSwapClient, isEvmSource } from '@clawswap/sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import 'dotenv/config';

// 1. No x402 needed — create client with plain fetch
const client = new ClawSwapClient();

// 2. Execute swap
const swap = await client.executeSwap({
  sourceChain: 'base',
  sourceToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  destinationChain: 'solana',
  destinationToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: '1000000',
  userWallet: '0x-your-base-address',
  recipient: 'your-solana-address',
});

// 3. Sign and submit to Base (execute transactions in order)
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
    console.log(`Base TX: https://basescan.org/tx/${txHash}`);
  }
}

// 4. Wait for settlement
const result = await client.waitForSettlement(swap.requestId, {
  timeout: 300_000,
  interval: 3000,
  onStatusUpdate: (status) => console.log(`Status: ${status.status}`),
});
console.log(`Swap completed: ${result.outputAmount} tokens delivered`);
```

## Web App Integration

The SDK works natively in the browser — no polyfills or Node.js shims needed. For a comprehensive guide, see [Web Integration Guide](./docs/web-integration.md).

### Browser Quick Start (Base → Solana)

```bash
npm install @clawswap/sdk viem
```

```typescript
import { ClawSwapClient, isEvmSource } from '@clawswap/sdk';
import { createWalletClient, createPublicClient, custom, http } from 'viem';
import { base } from 'viem/chains';

// 1. Connect browser wallet (MetaMask, Coinbase Wallet, etc.)
const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: custom(window.ethereum),
});

// 2. Create SDK client (no x402 payment needed for Base source — it's free)
const client = new ClawSwapClient();

// 3. Execute swap
const swap = await client.executeSwap({
  sourceChain: 'base',
  sourceToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  destinationChain: 'solana',
  destinationToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: '1000000', // 1 USDC
  userWallet: account,
  recipient: 'your-solana-address',
});

// 4. Sign and submit with browser wallet (MetaMask will pop up)
if (isEvmSource(swap)) {
  const publicClient = createPublicClient({ chain: base, transport: http() });
  for (const tx of swap.transactions) {
    const hash = await walletClient.sendTransaction({
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: BigInt(tx.value),
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`TX confirmed: https://basescan.org/tx/${hash}`);
  }
}

// 5. Monitor settlement
const result = await client.waitForSettlement(swap.requestId, {
  timeout: 300_000,
  onStatusUpdate: (s) => console.log(`Status: ${s.status}`),
});
```

### Integration Approaches

| Approach | Dependencies | Best For |
|----------|-------------|----------|
| **Raw viem** | `viem` | Simple apps, custom wallet UIs |
| **wagmi + ConnectKit** | `wagmi`, `viem`, `connectkit` | Production React/Next.js apps |

See [examples/browser/](./examples/browser/) for raw viem and [examples/browser-wagmi/](./examples/browser-wagmi/) for wagmi v2.

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
- ✅ **Multi-chain** - Bidirectional Solana ↔ Base swaps

## Packages

| Package | Description | NPM |
|---------|-------------|-----|
| [@clawswap/sdk](./packages/sdk) | Core framework-agnostic SDK | [![npm](https://img.shields.io/npm/v/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk) |

## Why ClawSwap?

**For AI Agents:**
- No API keys to manage
- Solana → Base: gasless, $0.50 flat fee via x402
- Base → Solana: free, agent pays ~$0.001 gas
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

## API Endpoints

ClawSwap API: `https://api.clawswap.dev`

- `GET /api/chains` - List supported chains (free)
- `GET /api/tokens/:chain` - List tokens for a chain (free)
- `POST /api/swap/quote` - Get swap quote (free)
- `POST /api/swap/execute` - Execute swap (Solana source: $0.50 USDC via x402 | Base source: free)
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
- [X](https://x.com/clawswapdev)
