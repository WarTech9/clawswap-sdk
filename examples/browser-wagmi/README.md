# ClawSwap SDK - wagmi v2 + ConnectKit Example

Production-ready browser example using [wagmi v2](https://wagmi.sh) and [ConnectKit](https://docs.family.co/connectkit) for wallet management.

## What This Demonstrates

- **wagmi v2** for wallet connection, chain management, and transaction sending
- **ConnectKit** for a polished wallet connection UI (MetaMask, Coinbase Wallet, WalletConnect, etc.)
- **ClawSwap SDK** for cross-chain swap execution (quote, execute, sign, monitor)
- **Custom `useClawSwap` hook** showing how to bridge the SDK with wagmi

## Prerequisites

- MetaMask, Coinbase Wallet, or other browser wallet
- Base network with USDC (for Base-source swaps)

## Running

From the monorepo root:

```bash
pnpm install
pnpm build
pnpm example:browser-wagmi
```

Open [http://localhost:5174](http://localhost:5174).

## Environment Variables

Create a `.env` file (optional):

```bash
# Override API URL (optional)
VITE_CLAWSWAP_API_URL=https://api.clawswap.dev

# WalletConnect project ID (optional, needed for WalletConnect wallets)
# Get one at https://cloud.walletconnect.com
VITE_WC_PROJECT_ID=your_project_id
```

## Key Files

| File | Description |
|------|-------------|
| `src/config/wagmi.ts` | wagmi configuration with Base chain and connectors |
| `src/hooks/useClawSwap.ts` | Custom hook wrapping ClawSwap SDK with wagmi wallet/public clients |
| `src/components/SwapForm.tsx` | Combined quote + execute form component |
| `src/components/SwapProgress.tsx` | Cross-chain settlement status polling |
| `src/main.tsx` | Provider setup (WagmiProvider + QueryClient + ConnectKit) |

## The `useClawSwap` Hook

The key integration pattern — a thin hook (~80 lines) that bridges the SDK with wagmi:

```typescript
import { useWalletClient, usePublicClient } from 'wagmi';
import { ClawSwapClient, isEvmSource } from '@clawswap/sdk';

export function useClawSwap() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const client = useMemo(() => new ClawSwapClient(), []);

  const executeAndSign = useCallback(async (params) => {
    const response = await client.executeSwap(params);

    if (isEvmSource(response)) {
      for (const tx of response.transactions) {
        const hash = await walletClient.sendTransaction({
          to: tx.to, data: tx.data, value: BigInt(tx.value),
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }

    return response;
  }, [walletClient, publicClient, client]);

  return { client, executeAndSign };
}
```

## Comparison: This vs Raw viem Example

| Feature | This (wagmi) | Raw viem (`examples/browser/`) |
|---------|-------------|-------------------------------|
| Wallet connection | ConnectKit UI | Manual `window.ethereum` |
| Supported wallets | MetaMask, Coinbase, WalletConnect, etc. | Injected only (MetaMask) |
| Chain switching | Automatic via wagmi | Manual `wallet_switchEthereumChain` |
| Reconnection | Automatic | Manual |
| Dependencies | wagmi, connectkit, @tanstack/react-query | viem only |
| Best for | Production React/Next.js apps | Simple apps, non-React frameworks |
