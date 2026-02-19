import { z } from 'zod';

/**
 * Tool parameters for GOAT plugin
 *
 * Note: In the actual GOAT SDK, these would use createToolParameters from '@goat-sdk/core'
 * This is a simplified version that would need to be wrapped with createToolParameters
 */

export const getQuoteParametersSchema = z.object({
  sourceChain: z.string().describe('Source blockchain ("solana")'),
  sourceToken: z.string().describe('Source token address'),
  destinationChain: z.string().describe('Destination blockchain ("base")'),
  destinationToken: z.string().describe('Destination token address'),
  amount: z.string().describe('Amount to swap (in smallest unit)'),
  senderAddress: z.string().describe('Sender address on source chain'),
  recipientAddress: z.string().describe('Recipient address on destination chain'),
});

export const executeSwapParametersSchema = z.object({
  sourceChain: z.string().describe('Source blockchain'),
  sourceToken: z.string().describe('Source token address'),
  destinationChain: z.string().describe('Destination blockchain'),
  destinationToken: z.string().describe('Destination token address'),
  amount: z.string().describe('Amount to swap'),
  senderAddress: z.string().describe('Sender address on source chain'),
  recipientAddress: z.string().describe('Recipient address on destination chain'),
  slippageTolerance: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Slippage tolerance (0-1)'),
  // Removed paymentChain - x402 currently supports Solana only
});

export const getStatusParametersSchema = z.object({
  orderId: z.string().describe('Order ID (returned from executeSwap)'),
});

export const waitForSettlementParametersSchema = z.object({
  orderId: z.string().describe('Order ID (returned from executeSwap)'),
  timeoutSeconds: z.number().positive().optional().describe('Maximum wait time in seconds'),
});

export const getTokensParametersSchema = z.object({
  chain: z.string().describe('Chain ID'),
});

export type GetQuoteParameters = z.infer<typeof getQuoteParametersSchema>;
export type ExecuteSwapParameters = z.infer<typeof executeSwapParametersSchema>;
export type GetStatusParameters = z.infer<typeof getStatusParametersSchema>;
export type WaitForSettlementParameters = z.infer<typeof waitForSettlementParametersSchema>;
export type GetTokensParameters = z.infer<typeof getTokensParametersSchema>;
