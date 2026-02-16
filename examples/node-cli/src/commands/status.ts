/**
 * Status command - check the status of a swap
 */

import { Command } from 'commander';
import { ClawSwapClient } from '@clawswap/sdk';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export const statusCommand = new Command('status')
  .description('Check the status of a swap')
  .argument('<swapId>', 'Swap ID to check')
  .option('--watch', 'Watch for status updates until completion')
  .action(async (swapId: string, options) => {
    try {
      const client = new ClawSwapClient({ baseUrl: config.API_URL });

      if (options.watch) {
        // Watch mode: poll until completion
        logger.info(`Watching swap ${swapId}...`);
        console.log();

        const result = await client.waitForSettlement(swapId, {
          timeout: 300000, // 5 minutes
          interval: 3000,
          onStatusUpdate: (status) => {
            console.clear();
            displayStatus(status);
          },
        });

        console.log();
        if (result.status === 'completed') {
          logger.success('Swap completed!');
        } else {
          logger.error(`Swap ${result.status}`);
          if (result.failureReason) {
            logger.error(`Reason: ${result.failureReason}`);
          }
        }
      } else {
        // One-time status check
        logger.info(`Fetching status for swap ${swapId}...`);
        const status = await client.getStatus(swapId);

        console.log();
        displayStatus(status);

        if (!['completed', 'failed', 'expired'].includes(status.status)) {
          console.log();
          logger.info('Swap is still in progress. Use --watch to monitor it:');
          console.log(`  pnpm dev -- status ${swapId} --watch`);
        }
      }

    } catch (error) {
      logger.error('Failed to fetch status:', error);
      process.exit(1);
    }
  });

/**
 * Display swap status in a readable format
 */
function displayStatus(status: any) {
  logger.table({
    'Swap ID': status.swapId,
    'Status': status.status,
    'Source Chain': status.sourceChainId,
    'Source Amount': status.sourceAmount,
    'Destination Chain': status.destinationChainId,
    'Destination Amount': status.destinationAmount,
  });

  // Show transactions
  if (status.transactions && status.transactions.length > 0) {
    console.log();
    console.log('Transactions:');
    status.transactions.forEach((tx: any) => {
      console.log(`  Chain: ${tx.chainId}`);
      console.log(`  Hash:  ${tx.txHash}`);
      console.log(`  Status: ${tx.status}`);
      if (tx.explorerUrl) {
        console.log(`  Explorer: ${tx.explorerUrl}`);
      }
      console.log();
    });
  }

  // Show failure reason if failed
  if (status.status === 'failed' && status.failureReason) {
    console.log();
    logger.error(`Failure reason: ${status.failureReason}`);
  }
}
