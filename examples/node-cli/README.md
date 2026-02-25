# ClawSwap Node.js CLI Example

Command-line interface for executing cross-chain swaps using the ClawSwap SDK.

## Setup

From the monorepo root:

```bash
pnpm install && pnpm build
```

Create a `.env` file:

```bash
# Required for swap execution
SOLANA_PRIVATE_KEY=<base58-encoded-key>

# Optional overrides
CLAWSWAP_API_URL=https://api.clawswap.dev
```

## CLI Commands

### Discovery

```bash
pnpm dev -- discovery chains
pnpm dev -- discovery tokens solana
pnpm dev -- discovery tokens base
```

### Quote

```bash
pnpm dev -- quote \
  --from solana:USDC \
  --to base:USDC \
  --amount 1000000 \
  --sender <solana-address> \
  --recipient <evm-address>
```

### Swap

Mock mode (no wallet):

```bash
pnpm dev -- swap \
  --from solana:USDC --to base:USDC \
  --amount 1000000 \
  --sender <solana-address> \
  --destination <evm-address> \
  --mock
```

Real swap (requires `SOLANA_PRIVATE_KEY`):

```bash
pnpm dev -- swap \
  --from solana:USDC --to base:USDC \
  --amount 1000000 \
  --sender <solana-address> \
  --destination <evm-address>
```

### Status

```bash
pnpm dev -- status <requestId>
pnpm dev -- status <requestId> --watch
```

## Token Shortcuts

| Shortcut | Solana | Base |
|----------|--------|------|
| USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| USDT | Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB | — |

## E2E Tests

Two test suites in `e2e/`:

- **`api-direct.ts`** — tests the HTTP API directly with raw fetch + x402
- **`sdk-integration.ts`** — tests the same flow via `ClawSwapClient`

Both have 5 sections:

| Section | What it tests | Requires |
|---------|--------------|----------|
| 1 — Discovery | `/api/chains`, `/api/tokens/:chain` | nothing |
| 2 — Quote | `/api/swap/quote` | nothing |
| 3 — Execute | `/api/swap/execute` with x402 payment | `SOLANA_PRIVATE_KEY` |
| 4 — Status | `/api/swap/:id/status` | `SOLANA_PRIVATE_KEY` |
| 5 — Sign & Submit | Sign + submit Solana tx, poll until settlement | `SOLANA_PRIVATE_KEY` |

### Running

Free run (sections 1–2 only, no key needed):

```bash
pnpm e2e:api
pnpm e2e:sdk
```

Full run with payment (sections 1–5, submits transaction by default):

```bash
SOLANA_PRIVATE_KEY=<base58-key> pnpm e2e:api
```

Skip transaction submission (sections 1–4 only):

```bash
SOLANA_PRIVATE_KEY=<base58-key> SKIP_SUBMIT=true pnpm e2e:api
```

Run both suites:

```bash
SOLANA_PRIVATE_KEY=<base58-key> pnpm e2e
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_PRIVATE_KEY` | For sections 3–5 | Base58-encoded Solana private key |
| `RECIPIENT_ADDRESS` | No | EVM address to receive funds (default: test address) |
| `SKIP_SUBMIT` | No | Set to `true` to skip signing and submitting the transaction |
| `CLAWSWAP_API_URL` | No | Override API base URL (default: `https://api.clawswap.dev`) |

> **Note:** If your `.env` overrides `CLAWSWAP_API_URL` to a local server, the e2e tests will hit that instead of production. Set it to `https://api.clawswap.dev` to run against the live API.

## Development

Built with:
- [Commander.js](https://github.com/tj/commander.js) — CLI framework
- [Chalk](https://github.com/chalk/chalk) — terminal colors
- [Viem](https://viem.sh) — EVM wallet integration
- [@x402/fetch](https://x402.org) — x402 payment protocol
