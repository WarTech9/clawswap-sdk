/**
 * Input validation and parsing utilities
 */

export interface TokenPair {
  chain: string;
  token: string;
}

/**
 * Parse a token pair string like "solana:USDC" or "arbitrum:0xabc..."
 */
export function parseTokenPair(input: string): TokenPair {
  const parts = input.split(':');

  if (parts.length !== 2) {
    throw new Error(
      'Invalid token pair format. Expected "chain:token" (e.g., "solana:USDC" or "arbitrum:0xabc...")'
    );
  }

  const [chain, token] = parts;

  if (!chain || !token) {
    throw new Error('Chain and token cannot be empty');
  }

  return { chain, token };
}

/**
 * Validate an Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a Solana address (base58)
 */
export function isValidSolanaAddress(address: string): boolean {
  // Basic check: 32-44 characters, base58 alphabet
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate an amount string
 */
export function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
}
