import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';

export const config = createConfig(
  getDefaultConfig({
    chains: [base],
    transports: {
      [base.id]: http(),
    },
    // WalletConnect project ID — get yours at https://cloud.walletconnect.com
    // Optional: only needed for WalletConnect-based wallets
    walletConnectProjectId: import.meta.env.VITE_WC_PROJECT_ID || '',
    appName: 'ClawSwap Demo',
    appDescription: 'Cross-chain swaps powered by the ClawSwap SDK',
  })
);
