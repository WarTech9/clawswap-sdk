/**
 * Consistent logging utilities for examples
 */

import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),

  success: (msg: string) => console.log(chalk.green('✓'), msg),

  error: (msg: string, error?: unknown) => {
    console.error(chalk.red('✗'), msg);
    if (error) {
      if (error instanceof Error) {
        console.error(chalk.red('  '), error.message);
        if (error.stack) {
          console.error(chalk.gray(error.stack));
        }
      } else {
        console.error(error);
      }
    }
  },

  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),

  table: (data: Record<string, string | number>) => {
    console.log();
    Object.entries(data).forEach(([key, value]) => {
      console.log(chalk.cyan(`  ${key}:`), chalk.white(value));
    });
    console.log();
  },
};
