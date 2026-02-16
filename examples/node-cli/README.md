# ClawSwap Node.js CLI Example

Command-line interface for executing cross-chain swaps using the ClawSwap SDK.

## Installation

From the root of the monorepo:

```bash
pnpm install
pnpm build
```

Or from this directory:

```bash
cd examples/node-cli
pnpm install
```

## Configuration

Create a `.env` file (copy from `.env.example`):

```bash
# Required for swap execution
EVM_PRIVATE_KEY=0x...

# Optional: Override API URL
CLAWSWAP_API_URL=https://api.clawswap.dev

# Optional: Test mode
TEST_MODE=dry-run  # mock | dry-run | full
```

## Usage

### Discovery Commands

List supported chains:
```bash
pnpm dev -- discovery chains
```

List tokens for a specific chain:
```bash
pnpm dev -- discovery tokens solana
pnpm dev -- discovery tokens base
```

List all supported swap pairs:
```bash
pnpm dev -- discovery pairs
```

### Get Quote

Get a quote for a swap:
```bash
pnpm dev -- quote \
  --from solana:USDC \
  --to base:USDC \
  --amount 1000000 \
  --sender 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri \
  --recipient 0x07150e919b4de5fd6a63de1f9384828396f25fdc
```

With full token addresses and custom slippage:
```bash
pnpm dev -- quote \
  --from solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --to base:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --amount 1000000 \
  --sender 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri \
  --recipient 0x07150e919b4de5fd6a63de1f9384828396f25fdc \
  --slippage 0.01
```

**Note:** Quotes expire in 30 seconds.

### Execute Swap

#### Mock Mode (No Wallet)
Test the swap flow without actual execution:
```bash
pnpm dev -- swap \
  --from solana:USDC \
  --to base:USDC \
  --amount 1000000 \
  --sender 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri \
  --destination 0x07150e919b4de5fd6a63de1f9384828396f25fdc \
  --mock
```

#### Real Swap (Requires Wallet)
Execute an actual cross-chain swap:
```bash
# Make sure EVM_PRIVATE_KEY is set in .env
pnpm dev -- swap \
  --from solana:USDC \
  --to base:USDC \
  --amount 1000000 \
  --sender 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri \
  --destination 0x07150e919b4de5fd6a63de1f9384828396f25fdc
```

This will:
1. Get a quote
2. Execute the swap (pays $0.50 USDC via x402)
3. Monitor status until completion

### Check Swap Status

Check status once:
```bash
pnpm dev -- status <swapId>
```

Watch for status updates until completion:
```bash
pnpm dev -- status <swapId> --watch
```

## Token Shortcuts

The CLI supports shortcuts for common tokens:

| Shortcut | Solana | Base |
|----------|--------|------|
| USDC     | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| USDT     | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB | - |

Examples:
```bash
# Using shortcuts
pnpm dev -- quote --from solana:USDC --to base:USDC --amount 1000000 \
  --sender 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri \
  --recipient 0x07150e919b4de5fd6a63de1f9384828396f25fdc

# Using full addresses
pnpm dev -- quote \
  --from solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --to base:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --amount 1000000 \
  --sender 83astBRguLMdt2h5U1Tpdq5tjFoJ6noeGwaY3mDLVcri \
  --recipient 0x07150e919b4de5fd6a63de1f9384828396f25fdc
```

## Error Handling

The CLI provides user-friendly error messages:

### Quote Expired
```
✗ Swap failed: Quote has expired
  Tip: Quotes expire in 30 seconds
```

### Insufficient Liquidity
```
✗ Failed to get quote: Insufficient liquidity for this swap
```

### Payment Required
```
✗ Payment failed or insufficient balance
  Check that your wallet has $0.50 USDC on Base
```

### Network Error
```
✗ Failed to get quote: Request timed out
```

## Running from Root

From the monorepo root, use the convenience script:

```bash
pnpm example:node -- discovery chains
pnpm example:node -- quote --from solana:USDC --to base:USDC --amount 1000000 \
  --sender <address> --recipient <address>
pnpm example:node -- swap --from solana:USDC --to base:USDC --amount 1000000 \
  --sender <address> --destination <address> --mock
```

## Example Output

### Quote Command
```
ℹ Fetching quote...
✓ Quote received:

  Quote ID: clawswap_quote_abc123
  Source Amount: 1000000
  Destination Amount: 998500
  Exchange Rate: 0.9985
  Bridge Fee: 500
  Protocol Fee: 1000
  Total Fee (USD): $0.50
  Expires In: 30s
  Expires At: 2026-02-12T10:30:00.000Z

⚠ Note: This quote expires in 30 seconds
```

### Swap Command (Mock)
```
ℹ Setting up x402 payment...
✓ x402 payment configured

ℹ Step 1/3: Getting quote...
✓ Quote received: 998500 tokens
⚠ Quote expires in 30 seconds

ℹ Step 2/3: Executing swap...
⚠ [MOCK MODE] Skipping actual swap execution
ℹ In real mode, this would:
  1. Pay $0.50 USDC via x402
  2. Initiate the cross-chain swap
  3. Monitor status until completion
```

### Swap Command (Real)
```
ℹ Step 1/3: Getting quote...
✓ Quote received: 998500 tokens

ℹ Step 2/3: Executing swap...
✓ Swap initiated!

  Swap ID: clawswap_swap_xyz789
  Status: pending
  Source Amount: 1000000
  Destination Amount: 998500

ℹ Step 3/3: Monitoring swap status...
ℹ This may take several minutes depending on network congestion

ℹ Status: initiated
  solana: 3X5Y... [confirmed]
    https://solscan.io/tx/3X5Y...

ℹ Status: bridging
  solana: 3X5Y... [confirmed]

ℹ Status: settling
  base: 0x7a8b... [pending]

ℹ Status: completed
  solana: 3X5Y... [confirmed]
  base: 0x7a8b... [confirmed]

✓ ✨ Swap completed successfully!

  Swap ID: clawswap_swap_xyz789
  Status: completed
  Source Amount: 1000000
  Destination Amount: 998500
  Destination Address: 0xYourAddress
```

## Building for Production

Build the CLI:
```bash
pnpm build
```

Run the built version:
```bash
pnpm start -- discovery chains
```

Or install globally:
```bash
npm link
clawswap-cli discovery chains
```

## Troubleshooting

See [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for common issues and solutions.

## Development

The CLI is built with:
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal colors
- [Viem](https://viem.sh) - EVM wallet integration
- [@x402/fetch](https://x402.org) - Payment protocol integration
