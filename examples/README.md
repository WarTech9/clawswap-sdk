# ClawSwap SDK Examples

Runnable examples demonstrating the ClawSwap SDK in both Node.js and browser environments.

## Quick Start

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- MetaMask (for browser example)

### Installation

From the root of the monorepo:

```bash
# Install all dependencies
pnpm install

# Build the SDK
pnpm build
```

## Examples

### 1. Node.js CLI Example

Command-line interface for executing cross-chain swaps.

```bash
# Run discovery commands (no wallet needed)
pnpm example:node -- discovery chains
pnpm example:node -- discovery tokens solana

# Get a quote (no wallet needed)
pnpm example:node -- quote \
  --from solana:USDC \
  --to arbitrum:USDC \
  --amount 1000000

# Execute swap with mock payment (testing)
pnpm example:node -- swap \
  --from solana:USDC \
  --to arbitrum:USDC \
  --amount 1000000 \
  --destination 0xYourAddress \
  --mock

# Check swap status
pnpm example:node -- status <swapId>
```

[Full Documentation →](./node-cli/README.md)

### 2. Browser Example

Interactive web application with wallet connection.

```bash
# Start dev server
pnpm example:browser

# Open http://localhost:5173
```

[Full Documentation →](./browser/README.md)

## Test Modes

The examples support three test modes:

### Mock Mode (No Wallet Required)
```bash
pnpm example:node -- swap ... --mock
```
- Simulates swap execution without real payment
- Perfect for CI/CD and testing SDK integration
- Does not execute actual blockchain transactions

### Dry Run Mode (Free Endpoints Only)
```bash
pnpm example:node -- quote ...
pnpm example:node -- discovery ...
```
- Calls actual API endpoints
- Gets real quotes and discovery data
- Stops before swap execution
- No wallet or payment required

### Full E2E Mode (Real Swaps)
```bash
# Set private key in .env
EVM_PRIVATE_KEY=0x...

# Execute real swap
pnpm example:node -- swap \
  --from solana:USDC \
  --to arbitrum:USDC \
  --amount 1000000 \
  --destination 0xYourAddress
```
- Executes actual cross-chain swaps
- Requires wallet with USDC on Base for x402 payment
- Monitors swap until completion

## Directory Structure

```
examples/
├── README.md                    # This file
├── TROUBLESHOOTING.md           # Common issues and solutions
├── shared/                      # Shared utilities
│   ├── constants.ts             # Token addresses, test amounts
│   ├── mock-payment.ts          # Mock x402 for testing
│   ├── logger.ts                # Logging utilities
│   └── validators.ts            # Input validation
├── node-cli/                    # Node.js CLI example
│   └── ...
└── browser/                     # Browser example
    └── ...
```

## Key Features Demonstrated

### Core SDK Features
- ✅ Getting quotes for cross-chain swaps
- ✅ Executing swaps with x402 payment
- ✅ Monitoring swap status in real-time
- ✅ Discovery endpoints (chains, tokens, pairs)
- ✅ Error handling with typed exceptions
- ✅ Quote expiry management (30s timeout)

### x402 Payment Integration
- ✅ EVM wallet setup with viem
- ✅ x402 client configuration for Base network
- ✅ Wrapped fetch for automatic payment handling
- ✅ Mock mode for testing without payment

### Cross-Environment Support
- ✅ Works in Node.js 18+ (using global fetch)
- ✅ Works in modern browsers (Chrome, Firefox, Safari)
- ✅ No environment-specific code in SDK

## Environment Variables

### Node CLI (`.env`)
```bash
EVM_PRIVATE_KEY=0x...           # Required for real swaps
CLAWSWAP_API_URL=https://...    # Optional: override API URL
TEST_MODE=dry-run                # mock | dry-run | full
```

### Browser (`.env`)
```bash
VITE_CLAWSWAP_API_URL=https://...  # Optional: override API URL
```

## Running in CI/CD

The examples are designed to run in CI/CD environments:

```yaml
# .github/workflows/e2e-examples.yml
- run: pnpm install
- run: pnpm build
- run: pnpm example:node -- discovery chains
- run: pnpm example:node -- quote ...
- run: pnpm example:node -- swap ... --mock
```

See [.github/workflows/e2e-examples.yml](../.github/workflows/e2e-examples.yml) for the complete workflow.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Additional Resources

- [ClawSwap SDK Documentation](../packages/sdk/README.md)
- [API Documentation](https://docs.clawswap.xyz)
- [GitHub Issues](https://github.com/clawswap/clawswap-sdk/issues)
