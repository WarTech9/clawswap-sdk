# ClawSwap SDK

TypeScript SDK for ClawSwap cross-chain token swaps, built for AI agents.

## Packages

| Package | Description | NPM |
|---------|-------------|-----|
| [@clawswap/sdk](./packages/sdk) | Core framework-agnostic SDK | [![npm](https://img.shields.io/npm/v/@clawswap/sdk)](https://www.npmjs.com/package/@clawswap/sdk) |
| [@clawswap/agentkit-plugin](./packages/agentkit-plugin) | Coinbase AgentKit integration | [![npm](https://img.shields.io/npm/v/@clawswap/agentkit-plugin)](https://www.npmjs.com/package/@clawswap/agentkit-plugin) |
| [@clawswap/goat-plugin](./packages/goat-plugin) | GOAT SDK integration | [![npm](https://img.shields.io/npm/v/@clawswap/goat-plugin)](https://www.npmjs.com/package/@clawswap/goat-plugin) |

## Quick Start

### Core SDK

```bash
npm install @clawswap/sdk @x402/fetch
```

```typescript
import { ClawSwapClient } from '@clawswap/sdk';
import { wrapFetchWithPayment } from '@x402/fetch';

const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);
const client = new ClawSwapClient({ fetch: fetchWithPayment });

const quote = await client.getQuote({
  sourceChainId: 'solana',
  sourceTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  destinationChainId: 'base',
  destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  amount: '1000000',
  senderAddress: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  recipientAddress: '0x07150e919b4de5fd6a63de1f9384828396f25fdc',
});

// Get token info for decimals
const sourceToken = await client.getTokenInfo('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const swap = await client.executeSwap({
  quote: quote,
  userWallet: '83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri',
  sourceTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  sourceTokenDecimals: sourceToken.decimals,
});

const result = await client.waitForSettlement(swap.swapId);
```

### AgentKit Plugin

```bash
npm install @clawswap/agentkit-plugin @coinbase/agentkit
```

```typescript
import { AgentKit } from '@coinbase/agentkit';
import { clawSwapActionProvider } from '@clawswap/agentkit-plugin';

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [clawSwapActionProvider()],
});

// Agent now has 6 ClawSwap actions
```

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
```

## Features

- ✅ **Type-safe** - Complete TypeScript interfaces
- ✅ **x402 Compatible** - Automatic payment handling
- ✅ **Framework Agnostic** - Works with any agent framework
- ✅ **Status Polling** - Built-in polling for swap completion
- ✅ **Typed Errors** - Specific error classes for each failure type
- ✅ **Multi-chain** - Supports Solana and Base

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

### Project Structure

```
clawswap-sdk/
├── packages/
│   ├── sdk/                  # Core SDK
│   ├── agentkit-plugin/      # AgentKit integration
│   └── goat-plugin/          # GOAT SDK integration
├── docs/                     # Documentation
└── pnpm-workspace.yaml       # Monorepo config
```

## Documentation

- [Core SDK Documentation](./packages/sdk/README.md)
- [AgentKit Plugin Documentation](./packages/agentkit-plugin/README.md)
- [GOAT Plugin Documentation](./packages/goat-plugin/README.md)
- [Implementation Plan](./docs/implementation-plan.md)

## API Endpoints

ClawSwap API: `https://api.clawswap.dev`

- `GET /api/chains` - List supported chains
- `GET /api/tokens/:chain` - List tokens for a chain
- `POST /api/swap/quote` - Get swap quote (free)
- `POST /api/swap/execute` - Execute swap ($0.50 USDC via x402)
- `GET /api/swap/:id/status` - Check swap status

## License

MIT

## Contributing

Contributions welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) first.

## Support

- [GitHub Issues](https://github.com/clawswap/clawswap-sdk/issues)
- [Documentation](https://docs.clawswap.xyz)
- [Discord](https://discord.gg/clawswap)
