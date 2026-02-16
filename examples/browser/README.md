# ClawSwap Browser Example

Interactive web application demonstrating ClawSwap SDK with browser wallet integration.

## Features

- 🔌 Connect MetaMask or other Web3 wallets
- 🔍 Discover supported chains and tokens
- 💱 Get real-time quotes for cross-chain swaps
- 🚀 Execute swaps with x402 automatic payment
- 📊 Monitor swap status with live updates
- 🔗 View transactions on block explorers

## Installation

From the root of the monorepo:

```bash
pnpm install
pnpm build
```

Or from this directory:

```bash
cd examples/browser
pnpm install
```

## Running the Example

### Development Mode

```bash
pnpm dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
pnpm build
pnpm preview
```

## Configuration

Create a `.env` file (optional):

```bash
# Optional: Override API URL
VITE_CLAWSWAP_API_URL=https://api.clawswap.dev
```

## Wallet Setup

### Prerequisites

1. **Install MetaMask**: [metamask.io](https://metamask.io)
2. **Add Base Network** to MetaMask:
   - Network Name: Base
   - RPC URL: https://mainnet.base.org
   - Chain ID: 8453
   - Currency Symbol: ETH
   - Block Explorer: https://basescan.org

3. **Get USDC on Base** for x402 payment:
   - You need ~$1 USDC on Base network
   - Bridge from Ethereum or other chains
   - Or buy directly on Base

### Connecting Your Wallet

1. Click "Connect Wallet" button
2. MetaMask will prompt for permission
3. Approve the connection
4. Your address will appear in the header

## Using the Application

### Step 1: Get a Quote

1. **Select source chain and token**
   - Choose from supported chains (Solana, Arbitrum, Base, etc.)
   - Select token (USDC, USDT, etc.)

2. **Select destination chain and token**
   - Choose where you want to receive tokens
   - Select the token to receive

3. **Enter amount**
   - Amount in smallest unit (e.g., 1000000 = 1 USDC)
   - The app will show you the exchange rate and fees

4. **Click "Get Quote"**
   - Quote is valid for 30 seconds
   - Shows destination amount, fees, and expiry time

### Step 2: Execute Swap

1. **Review the quote details**
   - Confirm amounts and fees
   - Note the quote expiration

2. **Click "Execute Swap"**
   - MetaMask will prompt for x402 payment ($0.50 USDC on Base)
   - Approve the transaction
   - Swap will be initiated

3. **Monitor Progress**
   - Real-time status updates
   - Transaction links for each chain
   - Completion notification

## Features in Detail

### Quote Form

- **Chain Selection**: Dropdown populated from API
- **Token Selection**: Filtered by selected chain
- **Amount Input**: Validates positive numbers
- **Quote Display**: Shows exchange rate, fees, expiry
- **Auto-refresh**: Chains and tokens loaded automatically

### Swap Button

- **Expiry Check**: Disables if quote expired
- **Payment Info**: Shows x402 fee details
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during execution

### Status Panel

- **Real-time Updates**: Polls every 3 seconds
- **Status Badge**: Visual indicator (pending, bridging, completed)
- **Transactions List**: Shows all transactions with links
- **Explorer Links**: Direct links to block explorers
- **Auto-stop**: Stops polling when completed/failed

## Architecture

### Tech Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Fast build tool and dev server
- **Viem**: Ethereum wallet integration
- **@x402/fetch**: Payment protocol integration

### File Structure

```
src/
├── main.tsx                 # Entry point
├── App.tsx                  # Main app component
├── styles.css               # Global styles
├── hooks/
│   └── useWallet.ts         # Wallet connection logic
└── components/
    ├── QuoteForm.tsx        # Get quote UI
    ├── SwapButton.tsx       # Execute swap button
    └── StatusPanel.tsx      # Real-time status display
```

### Key Hooks

#### `useWallet`

Manages wallet connection and x402 setup:

```typescript
const { connected, address, connect, fetchWithPayment } = useWallet();
```

- `connected`: Boolean indicating wallet connection
- `address`: Connected wallet address
- `connect`: Function to trigger MetaMask connection
- `fetchWithPayment`: x402-wrapped fetch for SDK

#### `useEffect` for Polling

StatusPanel uses React's `useEffect` to poll for updates:

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const status = await client.getStatus(swapId);
    if (isTerminalStatus(status.status)) {
      clearInterval(interval);
    }
  }, 3000);
  return () => clearInterval(interval);
}, [swapId]);
```

## Styling

The example uses custom CSS with:
- **Gradient background**: Purple gradient
- **Glass morphism**: Frosted glass effect for cards
- **Responsive design**: Works on mobile and desktop
- **Status colors**: Visual feedback for swap states
- **Animations**: Loading spinners and transitions

You can customize styles in `src/styles.css`.

## Running from Root

From the monorepo root:

```bash
pnpm example:browser
```

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Full support |
| Firefox | 88+     | ✅ Full support |
| Safari  | 15+     | ✅ Full support |
| Edge    | 90+     | ✅ Full support |

**Requirements:**
- Modern browser with Web3 wallet extension
- JavaScript enabled
- LocalStorage enabled (for wallet connection)

## Troubleshooting

### "Please install MetaMask"

- Install [MetaMask browser extension](https://metamask.io)
- Refresh the page after installation

### "Failed to connect wallet"

- Unlock MetaMask
- Try disconnecting and reconnecting
- Check browser console for errors

### "Payment failed"

- Ensure you have USDC on Base network
- Check you're connected to Base network in MetaMask
- Verify you have enough USDC for the swap fee ($0.50)

### Quote Expires Immediately

- Check your system clock is accurate
- Quote expires in 30 seconds - execute quickly
- Get a new quote if expired

### Status Not Updating

- Check internet connection
- Verify API is accessible
- Check browser console for errors

See [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for more solutions.

## Development Tips

### Hot Module Replacement

Vite supports HMR - changes reflect instantly:
```bash
pnpm dev
# Edit files and see changes immediately
```

### Debugging

Open browser DevTools:
- **Console**: View logs and errors
- **Network**: Inspect API calls
- **React DevTools**: Inspect component state

### Testing Without Wallet

To test UI without MetaMask:
1. Comment out wallet requirement in `App.tsx`
2. Use a mock client without payment
3. Test free endpoints (discovery, quote)

## Deployment

### Build for Production

```bash
pnpm build
```

Outputs to `dist/` directory.

### Deploy to Vercel

```bash
vercel deploy
```

### Deploy to Netlify

```bash
netlify deploy --dir=dist --prod
```

### Environment Variables

Set in your hosting platform:
```bash
VITE_CLAWSWAP_API_URL=https://api.clawswap.dev
```

## Security Notes

- Private keys never leave your wallet
- x402 payment handled by user's wallet
- No sensitive data stored in browser
- All API calls use HTTPS

## Additional Resources

- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Viem Documentation](https://viem.sh)
- [x402 Protocol](https://x402.org)
