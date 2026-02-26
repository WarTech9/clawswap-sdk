/**
 * Status command - check the status of a swap
 */

import { Command } from 'commander';
import { ClawSwapClient } from '@clawswap/sdk';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export const statusCommand = new Command('status')
  .description('Check the status of a swap')
  .argument('<requestId>', 'Request ID to check')
  .option('--watch', 'Watch for status updates until completion')
  .action(async (requestId: string, options) => {
    try {
      const client = new ClawSwapClient({ baseUrl: config.API_URL });

      if (options.watch) {
        // Watch mode: poll until completion
        logger.info(`Watching swap ${requestId}...`);
        console.log();

        const result = await client.waitForSettlement(requestId, {
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
        }
      } else {
        // One-time status check
        logger.info(`Fetching status for swap ${requestId}...`);
        const status = await client.getStatus(requestId);

        console.log();
        displayStatus(status);

        if (!['completed', 'failed'].includes(status.status)) {
          console.log();
          logger.info('Swap is still in progress. Use --watch to monitor it:');
          console.log(`  pnpm dev -- status ${requestId} --watch`);
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
    'Request ID': status.requestId,
    'Status': status.status,
    'Source Chain': status.sourceChain,
    'Destination Chain': status.destinationChain,
    'Output Amount': status.outputAmount,
  });

  // Show transaction hashes if available
  if (status.sourceTxHash || status.destinationTxHash) {
    console.log();
    console.log('Transactions:');
    if (status.sourceTxHash) {
      console.log(`  Source TX: ${status.sourceTxHash}`);
    }
    if (status.destinationTxHash) {
      console.log(`  Destination TX: ${status.destinationTxHash}`);
    }
  }

  // Show completion time if available
  if (status.completedAt) {
    console.log();
    console.log(`  Completed at: ${status.completedAt}`);
  }
}
