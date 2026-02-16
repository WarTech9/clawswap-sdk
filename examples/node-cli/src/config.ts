/**
 * Configuration from environment variables
 */

import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export const config = {
  SOLANA_PRIVATE_KEY: process.env.SOLANA_PRIVATE_KEY,
  EVM_PRIVATE_KEY: process.env.EVM_PRIVATE_KEY,
  API_URL: process.env.CLAWSWAP_API_URL || 'https://api.clawswap.dev',
  TEST_MODE: (process.env.TEST_MODE || 'dry-run') as 'mock' | 'dry-run' | 'full',
};
