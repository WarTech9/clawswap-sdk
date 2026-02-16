# @clawswap/goat-plugin

GOAT SDK plugin for ClawSwap cross-chain token swaps.

## Installation

```bash
npm install @clawswap/goat-plugin @goat-sdk/core @x402/fetch
# or
pnpm add @clawswap/goat-plugin @goat-sdk/core @x402/fetch
```

## Quick Start

```typescript
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai';
import { viem } from '@goat-sdk/wallet-viem';
import { clawSwap } from '@clawswap/goat-plugin';

const tools = await getOnChainTools({
  wallet: viem(walletClient),
  plugins: [clawSwap()],
});

// Use with Vercel AI, LangChain, or other frameworks
```

## Available Tools

The plugin provides 6 tools for your GOAT-powered agent:

### 1. `clawswap_get_quote`

Get a quote for swapping tokens across blockchains.

**Parameters:**
- `sourceChain` - Source blockchain ("solana")
- `sourceToken` - Source token address
- `destinationChain` - Destination blockchain ("base")
- `destinationToken` - Destination token address
- `amount` - Amount to swap (in smallest unit)

### 2. `clawswap_execute_swap`

Execute a cross-chain token swap (requires $0.50 USDC payment).

**Parameters:**
- All quote parameters plus:
- `destinationAddress` - Recipient address on destination chain
- `slippageTolerance` - Optional, 0-1 (default: 0.01)

### 3. `clawswap_get_status`

Check the status of a swap transaction.

**Parameters:**
- `swapId` - Swap transaction ID

### 4. `clawswap_wait_for_settlement`

Wait for a swap transaction to complete.

**Parameters:**
- `swapId` - Swap transaction ID
- `timeoutSeconds` - Optional, max wait time (default: 300)

### 5. `clawswap_get_chains`

Get list of supported blockchain networks.

**Parameters:** None

### 6. `clawswap_get_tokens`

Get list of tokens supported on a specific blockchain.

**Parameters:**
- `chain` - Chain ID (e.g., "solana")

## Usage with Vercel AI

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai';
import { viem } from '@goat-sdk/wallet-viem';
import { clawSwap } from '@clawswap/goat-plugin';

const tools = await getOnChainTools({
  wallet: viem(walletClient),
  plugins: [clawSwap()],
});

const result = await generateText({
  model: openai('gpt-4'),
  tools: tools,
  prompt: 'Swap 1 USDC from Solana to Base',
});
```

## Usage with LangChain

```typescript
import { getOnChainTools } from '@goat-sdk/adapter-langchain';
import { ChatOpenAI } from '@langchain/openai';
import { clawSwap } from '@clawswap/goat-plugin';

const tools = await getOnChainTools({
  wallet: viem_wallet,
  plugins: [clawSwap()],
});

const agent = await createReactAgent({
  llmWithTools: model,
  tools: tools,
});
```

## Configuration

The plugin automatically wraps your wallet with x402 payment handling. Ensure your wallet has USDC for swap payments ($0.50 per swap).

## TypeScript

Full TypeScript support with type definitions included.

```typescript
import type { GetQuoteParameters, ExecuteSwapParameters } from '@clawswap/goat-plugin';
```

## License

MIT
