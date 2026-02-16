# @clawswap/agentkit-plugin

Coinbase AgentKit plugin for ClawSwap cross-chain token swaps.

## Installation

```bash
npm install @clawswap/agentkit-plugin @coinbase/agentkit @x402/fetch
# or
pnpm add @clawswap/agentkit-plugin @coinbase/agentkit @x402/fetch
```

## Quick Start

```typescript
import { AgentKit } from '@coinbase/agentkit';
import { clawSwapActionProvider } from '@clawswap/agentkit-plugin';

const agentKit = await AgentKit.from({
  cdpApiKeyId: process.env.CDP_API_KEY_NAME,
  cdpApiKeySecret: process.env.CDP_API_KEY_SECRET,
  actionProviders: [clawSwapActionProvider()],
});

// Your agent now has 6 ClawSwap actions available
```

## Available Actions

The plugin provides 6 actions for your AgentKit agent:

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

Wait for a swap transaction to complete (polls until done).

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

## Usage Example

```typescript
// Agent conversation:
// User: "Swap 1 USDC from Solana to Base to address 0x..."

// Agent will automatically:
// 1. Call clawswap_get_quote to get a quote
// 2. Call clawswap_execute_swap with the quote details
// 3. Call clawswap_wait_for_settlement to track completion
```

## Configuration

The plugin automatically wraps your agent's wallet with x402 payment handling. Ensure your agent has USDC for swap payments ($0.50 per swap).

## TypeScript

Full TypeScript support with type definitions included.

```typescript
import type { GetQuoteInput, ExecuteSwapInput } from '@clawswap/agentkit-plugin';
```

## License

MIT
