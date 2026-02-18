# ClawSwap API v2 Migration Guide

**Breaking Change:** Execute endpoint simplified to accept `QuoteRequest` directly.

---

## What Changed

### Before (v1):
```typescript
// Step 1: Get quote
const quote = await api.swap.quote({
  sourceChainId: "solana",
  destinationChainId: "base",
  sourceTokenAddress: "EPjF...",
  destinationTokenAddress: "0x8335...",
  amount: "1000000",
  senderAddress: "vines1...",
  recipientAddress: "0xd8dA...",
});

// Step 2: Pass entire quote object to execute
const result = await api.swap.execute({
  quote: quote,                    // ❌ Removed
  userWallet: "vines1...",         // ❌ Removed
  sourceTokenMint: "EPjF...",      // ❌ Removed
  sourceTokenDecimals: 6           // ❌ Removed
});
```

### After (v2):
```typescript
// Option 1: Execute directly (recommended)
const result = await api.swap.execute({
  sourceChainId: "solana",
  destinationChainId: "base",
  sourceTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  destinationTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  amount: "1000000",
  senderAddress: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
  recipientAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  slippageTolerance: 0.5  // Optional
});

// Option 2: Preview with quote first (optional)
const preview = await api.swap.quote(request);
// ... show user preview ...
const result = await api.swap.execute(request); // Same request!
```

---

## Summary of Changes

**Removed Fields:**
- ❌ `quote` - No longer pass quote object
- ❌ `userWallet` - Use `senderAddress` instead
- ❌ `sourceTokenMint` - Use `sourceTokenAddress` instead
- ❌ `sourceTokenDecimals` - Automatically fetched from blockchain

**New Behavior:**
- ✅ Execute accepts `QuoteRequest` (same format as quote endpoint)
- ✅ Quote endpoint is optional (use for preview only)
- ✅ Execute fetches fresh quote internally
- ✅ Token decimals automatically fetched from Solana mint

**Benefits:**
- Simpler, consistent interface across quote and execute
- No quote expiry issues
- Fresh rates guaranteed at execution time
- Cleaner SDK implementation

---

## Complete Example

```typescript
import { ClawSwapClient } from '@clawswap/sdk';

const client = new ClawSwapClient();

// Define swap parameters
const swapRequest = {
  sourceChainId: "solana",
  destinationChainId: "base",
  sourceTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  destinationTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
  amount: "1000000", // 1 USDC (6 decimals)
  senderAddress: userWallet.publicKey.toBase58(),
  recipientAddress: destinationAddress,
  slippageTolerance: 0.5 // 0.5%
};

// Execute swap (API fetches fresh quote internally)
const { transaction, metadata } = await client.swap.execute(swapRequest);

console.log('Payment amount:', metadata.paymentAmount);
console.log('Gas cost:', metadata.gasLamports);
console.log('Is Token-2022:', metadata.isToken2022);

// Sign and send
const signed = await userWallet.signTransaction(transaction);
const signature = await connection.sendRawTransaction(signed.serialize());
```

---

## SDK Implementation Checklist

**Required Changes:**
- [ ] Update `execute()` method to accept `QuoteRequest` type
- [ ] Remove `quote`, `userWallet`, `sourceTokenMint`, `sourceTokenDecimals` parameters
- [ ] Update TypeScript interfaces to use shared `QuoteRequest` type
- [ ] Update examples/documentation to show optional quote preview pattern

**Testing:**
- [ ] Test executing without calling quote first
- [ ] Test quote preview → execute flow
- [ ] Verify error handling for Relay quote fetch failures
- [ ] Verify transaction signing still works correctly

**Documentation:**
- [ ] Update API reference with new QuoteRequest schema
- [ ] Add migration examples for existing users
- [ ] Update quickstart guides

---

## Error Handling

New error codes from internal quote fetching:

```typescript
// Relay quote failure
{
  status: 400,
  error: "Failed to get quote",
  code: "INSUFFICIENT_LIQUIDITY",
  details: "Not enough liquidity"
}

// Invalid quote response
{
  status: 500,
  error: "Invalid quote response from Relay"
}

// Zero gas cost
{
  status: 400,
  error: "Gas cost is zero. Invalid quote."
}
```

---

## Resources

- **OpenAPI Spec**: `GET /api/openapi`
- **API Docs**: [CLAUDE.md](../CLAUDE.md#execute-endpoint-interface)
- **Live Endpoint**: `https://api.clawswap.dev/api/swap/execute`

---

**Questions?** Open an issue or contact the ClawSwap team# ClawSwap API v2 Migration Guide

**Breaking Change:** Execute endpoint simplified to accept `QuoteRequest` directly.

---

## What Changed

### Before (v1):
```typescript
// Step 1: Get quote
const quote = await api.swap.quote({
  sourceChainId: "solana",
  destinationChainId: "base",
  sourceTokenAddress: "EPjF...",
  destinationTokenAddress: "0x8335...",
  amount: "1000000",
  senderAddress: "vines1...",
  recipientAddress: "0xd8dA...",
});

// Step 2: Pass entire quote object to execute
const result = await api.swap.execute({
  quote: quote,                    // ❌ Removed
  userWallet: "vines1...",         // ❌ Removed
  sourceTokenMint: "EPjF...",      // ❌ Removed
  sourceTokenDecimals: 6           // ❌ Removed
});
```

### After (v2):
```typescript
// Option 1: Execute directly (recommended)
const result = await api.swap.execute({
  sourceChainId: "solana",
  destinationChainId: "base",
  sourceTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  destinationTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  amount: "1000000",
  senderAddress: "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg",
  recipientAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  slippageTolerance: 0.5  // Optional
});

// Option 2: Preview with quote first (optional)
const preview = await api.swap.quote(request);
// ... show user preview ...
const result = await api.swap.execute(request); // Same request!
```

---

## Summary of Changes

**Removed Fields:**
- ❌ `quote` - No longer pass quote object
- ❌ `userWallet` - Use `senderAddress` instead
- ❌ `sourceTokenMint` - Use `sourceTokenAddress` instead
- ❌ `sourceTokenDecimals` - Automatically fetched from blockchain

**New Behavior:**
- ✅ Execute accepts `QuoteRequest` (same format as quote endpoint)
- ✅ Quote endpoint is optional (use for preview only)
- ✅ Execute fetches fresh quote internally
- ✅ Token decimals automatically fetched from Solana mint

**Benefits:**
- Simpler, consistent interface across quote and execute
- No quote expiry issues
- Fresh rates guaranteed at execution time
- Cleaner SDK implementation

---

## Complete Example

```typescript
import { ClawSwapClient } from '@clawswap/sdk';

const client = new ClawSwapClient();

// Define swap parameters
const swapRequest = {
  sourceChainId: "solana",
  destinationChainId: "base",
  sourceTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  destinationTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
  amount: "1000000", // 1 USDC (6 decimals)
  senderAddress: userWallet.publicKey.toBase58(),
  recipientAddress: destinationAddress,
  slippageTolerance: 0.5 // 0.5%
};

// Execute swap (API fetches fresh quote internally)
const { transaction, metadata } = await client.swap.execute(swapRequest);

console.log('Order ID:', metadata.orderId); // Use this to track swap status
console.log('Payment amount:', metadata.paymentAmount);
console.log('Gas cost:', metadata.gasLamports);
console.log('Is Token-2022:', metadata.isToken2022);

// Sign and send
const signed = await userWallet.signTransaction(transaction);
const signature = await connection.sendRawTransaction(signed.serialize());

// Track swap status using the order ID
const status = await client.swap.getStatus(metadata.orderId);
```

---

## SDK Implementation Checklist

**Required Changes:**
- [ ] Update `execute()` method to accept `QuoteRequest` type
- [ ] Remove `quote`, `userWallet`, `sourceTokenMint`, `sourceTokenDecimals` parameters
- [ ] Update TypeScript interfaces to use shared `QuoteRequest` type
- [ ] Update examples/documentation to show optional quote preview pattern

**Testing:**
- [ ] Test executing without calling quote first
- [ ] Test quote preview → execute flow
- [ ] Verify error handling for Relay quote fetch failures
- [ ] Verify transaction signing still works correctly

**Documentation:**
- [ ] Update API reference with new QuoteRequest schema
- [ ] Add migration examples for existing users
- [ ] Update quickstart guides

---

## Error Handling

New error codes from internal quote fetching:

```typescript
// Relay quote failure
{
  status: 400,
  error: "Failed to get quote",
  code: "INSUFFICIENT_LIQUIDITY",
  details: "Not enough liquidity"
}

// Invalid quote response
{
  status: 500,
  error: "Invalid quote response from Relay"
}

// Zero gas cost
{
  status: 400,
  error: "Gas cost is zero. Invalid quote."
}
```

---

## Resources

- **OpenAPI Spec**: `GET /api/openapi`
- **API Docs**: [CLAUDE.md](../CLAUDE.md#execute-endpoint-interface)
- **Live Endpoint**: `https://api.clawswap.dev/api/swap/execute`

---

**Questions?** Open an issue or contact the ClawSwap team..