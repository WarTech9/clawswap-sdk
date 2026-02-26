# Changelog

## 0.2.0 (2026-02-26)

### Breaking Changes

- **Renamed request parameters** to align with v2 API:
  - `sourceChainId` → `sourceChain`
  - `destinationChainId` → `destinationChain`
  - `sourceTokenAddress` → `sourceToken`
  - `destinationTokenAddress` → `destinationToken`
  - `senderAddress` → `userWallet`
  - `recipientAddress` → `recipient`

- **Redesigned `QuoteResponse`**:
  - Added: `estimatedOutput`, `estimatedOutputFormatted`, `estimatedTime`, `fees.clawswap`, `fees.relay`, `fees.gas`, `route`, `supported`
  - Removed: `quoteId`, `sourceAmount`, `destinationAmount`, `fees.totalEstimatedFeeUsd`, `estimatedTimeSeconds`, `expiresIn`, `expiresAt`

- **Redesigned `ExecuteSwapResponse`**:
  - `orderId` → `requestId`
  - Added: `sourceChain`, `estimatedOutput`, `estimatedTime`, `fees`, `instructions`
  - Removed: `isToken2022`, `accounting`

- **Redesigned `StatusResponse`**:
  - `orderId` → `requestId`
  - `sourceChainId`/`destinationChainId` → `sourceChain`/`destinationChain`
  - `destinationAmount` → `outputAmount`
  - Added: `completedAt`
  - Removed: `explorerUrl`, `failureReason`

- **Narrowed `SwapStatus`** to `pending | submitted | filling | completed | failed` (removed `created`, `fulfilled`, `cancelled`)

### New Features

- **Bidirectional swaps**: Base → Solana support with EVM transaction signing flow
- **`EvmTransaction` type**: Structured EVM transaction objects for Base-source swaps
- **`isSolanaSource()` / `isEvmSource()` type guards**: Distinguish Solana-source vs EVM-source execute responses

### Infrastructure

- CI upgraded to pnpm 10 (lockfile v9 compatibility)
- Updated all example apps (node-cli, browser, browser-wagmi) to v2 API

## 0.1.0

Initial release with Solana → Base cross-chain swaps via x402 micropayments.
