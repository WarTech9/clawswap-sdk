#!/usr/bin/env node

/**
 * ClawSwap SDK Node.js CLI Example
 *
 * This CLI demonstrates how to use the ClawSwap SDK to perform
 * cross-chain swaps from a Node.js environment.
 */

import { Command } from 'commander';
import { discoveryCommand } from './commands/discovery.js';
import { quoteCommand } from './commands/quote.js';
import { swapCommand } from './commands/swap.js';
import { statusCommand } from './commands/status.js';

const program = new Command()
  .name('clawswap-cli')
  .description('ClawSwap SDK Node.js CLI Example')
  .version('0.1.0');

program.addCommand(discoveryCommand);
program.addCommand(quoteCommand);
program.addCommand(swapCommand);
program.addCommand(statusCommand);

program.parse();
