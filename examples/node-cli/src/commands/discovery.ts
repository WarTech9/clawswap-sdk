/**
 * Discovery commands - list supported chains, tokens, and pairs
 */

import { Command } from 'commander';
import { ClawSwapClient } from '@clawswap/sdk';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export const discoveryCommand = new Command('discovery')
  .description('Discover supported chains, tokens, and pairs');

// List chains
discoveryCommand
  .command('chains')
  .description('List all supported blockchains')
  .action(async () => {
    try {
      const client = new ClawSwapClient({ baseUrl: config.API_URL });

      logger.info('Fetching supported chains...');
      const chains = await client.getSupportedChains();

      logger.success(`Found ${chains.length} supported chains:`);
      console.log();

      chains.forEach((chain) => {
        console.log(`  ${chain.name} (${chain.id})`);
      });

      console.log();
    } catch (error) {
      logger.error('Failed to fetch chains:', error);
      process.exit(1);
    }
  });

// List tokens for a chain
discoveryCommand
  .command('tokens')
  .description('List supported tokens for a blockchain')
  .argument('<chainId>', 'Blockchain ID (e.g., solana, arbitrum)')
  .action(async (chainId: string) => {
    try {
      const client = new ClawSwapClient({ baseUrl: config.API_URL });

      logger.info(`Fetching tokens for ${chainId}...`);
      const tokens = await client.getSupportedTokens(chainId);

      logger.success(`Found ${tokens.length} supported tokens:`);
      console.log();

      tokens.forEach((token) => {
        console.log(`  ${token.symbol} - ${token.name}`);
        console.log(`    Address: ${token.address}`);
        console.log(`    Decimals: ${token.decimals}`);
        console.log();
      });
    } catch (error) {
      logger.error('Failed to fetch tokens:', error);
      process.exit(1);
    }
  });

// List supported pairs
discoveryCommand
  .command('pairs')
  .description('List all supported swap pairs')
  .action(async () => {
    try {
      const client = new ClawSwapClient({ baseUrl: config.API_URL });

      logger.info('Fetching supported pairs...');
      const pairs = await client.getSupportedPairs();

      logger.success(`Found ${pairs.length} supported pairs:`);
      console.log();

      pairs.forEach((pair) => {
        console.log(`  ${pair.sourceChainId}:${pair.sourceTokenSymbol} → ${pair.destinationChainId}:${pair.destinationTokenSymbol}`);
      });

      console.log();
    } catch (error) {
      logger.error('Failed to fetch pairs:', error);
      process.exit(1);
    }
  });
