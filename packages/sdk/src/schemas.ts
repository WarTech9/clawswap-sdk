import { z } from 'zod';

/**
 * Zod schemas for request/response validation
 */

// Chain ID validation
export const chainIdSchema = z.string().min(1, 'Chain ID is required');

// Token address validation (supports EVM and Solana)
export const tokenAddressSchema = z.string().min(1, 'Token address is required');

// Amount validation (positive number as string)
export const amountSchema = z.string().refine(
  (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  },
  { message: 'Amount must be a positive number' }
);

// Address validation (supports EVM 0x... and Solana base58)
export const addressSchema = z.string().min(1, 'Address is required').refine(
  (val) => {
    // EVM address: 0x + 40 hex chars
    const isEvm = /^0x[a-fA-F0-9]{40}$/i.test(val);
    // Solana address: 32-44 base58 chars
    const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val);
    return isEvm || isSolana;
  },
  { message: 'Invalid address format (must be EVM 0x... or Solana base58)' }
);

// Quote request schema
export const quoteRequestSchema = z.object({
  sourceChainId: chainIdSchema,
  sourceTokenAddress: tokenAddressSchema,
  destinationChainId: chainIdSchema,
  destinationTokenAddress: tokenAddressSchema,
  amount: amountSchema,
  senderAddress: addressSchema,
  recipientAddress: addressSchema,
  slippageTolerance: z.number().min(0).max(1).optional(),
});

// Status request schema
export const statusRequestSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type StatusRequestInput = z.infer<typeof statusRequestSchema>;
