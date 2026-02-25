/**
 * Quote command - get a quote for a cross-chain swap
 */

import { Command } from 'commander';
import { ClawSwapClient } from '@clawswap/sdk';
import { logger } from '../utils/logger.js';
import { parseTokenPair, isValidAmount } from '../utils/validators.js';
import { TEST_TOKENS } from '../utils/constants.js';
import { config } from '../config.js';

export const quoteCommand = new Command('quote')
  .description('Get a quote for a cross-chain swap')
  .requiredOption('--from <chain:token>', 'Source chain and token (e.g., "solana:USDC" or "solana:EPj...")')
  .requiredOption('--to <chain:token>', 'Destination chain and token')
  .requiredOption('--amount <amount>', 'Amount to swap')
  .requiredOption('--sender <address>', 'Sender wallet address on source chain')
  .requiredOption('--recipient <address>', 'Recipient wallet address on destination chain')
  .option('--slippage <percent>', 'Slippage tolerance (0-1)', '0.01')
  .action(async (options) => {
    try {
      // Parse and validate inputs
      const source = parseTokenPair(options.from);
      const dest = parseTokenPair(options.to);

      if (!isValidAmount(options.amount)) {
        throw new Error('Invalid amount. Must be a positive number.');
      }

      const slippage = parseFloat(options.slippage);
      if (isNaN(slippage) || slippage < 0 || slippage > 1) {
        throw new Error('Invalid slippage. Must be between 0 and 1.');
      }

      // Resolve token shortcuts (USDC -> full address)
      const sourceToken = resolveToken(source.chain, source.token);
      const destToken = resolveToken(dest.chain, dest.token);

      // Create client and get quote
      const client = new ClawSwapClient({ baseUrl: config.API_URL });

      logger.info('Fetching quote...');
      const quote = await client.getQuote({
        sourceChain: source.chain,
        sourceToken: sourceToken,
        destinationChain: dest.chain,
        destinationToken: destToken,
        amount: options.amount,
        userWallet: options.sender,
        recipient: options.recipient,
        slippageTolerance: slippage,
      });

      logger.success('Quote received:');
      logger.table({
        'Estimated Output': quote.estimatedOutputFormatted,
        'Estimated Time': `${quote.estimatedTime}s`,
        'ClawSwap Fee': quote.fees.clawswap,
        'Relay Fee': quote.fees.relay,
        'Gas Fee': quote.fees.gas,
        'Route': `${quote.route.sourceChain} (${quote.route.sourceToken.symbol}) → ${quote.route.destinationChain} (${quote.route.destinationToken.symbol})`,
        'Supported': quote.supported ? 'Yes' : 'No',
      });

      console.log();
      console.log('To execute this swap, run:');
      console.log(`  pnpm dev -- swap --from ${options.from} --to ${options.to} --amount ${options.amount} --destination <address>`);
      console.log();

    } catch (error) {
      logger.error('Failed to get quote:', error);
      process.exit(1);
    }
  });

/**
 * Resolve token shortcuts like "USDC" to full addresses
 */
function resolveToken(chain: string, token: string): string {
  // If already a full address, return as-is
  if (token.length > 10) {
    return token;
  }

  // Try to resolve from TEST_TOKENS
  const chainTokens = TEST_TOKENS[chain as keyof typeof TEST_TOKENS];
  if (chainTokens) {
    const resolved = chainTokens[token as keyof typeof chainTokens];
    if (resolved) {
      return resolved;
    }
  }

  // Fallback to original token
  return token;
}
