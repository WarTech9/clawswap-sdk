import { z } from 'zod';

/**
 * Action input schemas using Zod
 * AgentKit uses these for input validation
 */

export const getQuoteInputSchema = z.object({
  sourceChain: z.string().describe('Source blockchain ("solana")'),
  sourceToken: z.string().describe('Source token address'),
  destinationChain: z.string().describe('Destination blockchain ("base")'),
  destinationToken: z.string().describe('Destination token address'),
  amount: z.string().describe('Amount to swap (in smallest unit, e.g., lamports)'),
  senderAddress: z.string().describe('Sender address on source chain'),
  recipientAddress: z.string().describe('Recipient address on destination chain'),
  slippageTolerance: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Slippage tolerance (0-1, default: 0.01)'),
});

export const executeSwapInputSchema = getQuoteInputSchema.extend({
  paymentChain: z
    .enum(['solana', 'base'])
    .default('solana')
    .describe('Chain to pay x402 fee (default: solana)'),
});

export const getStatusInputSchema = z.object({
  swapId: z.string().describe('Swap transaction ID'),
});

export const waitForSettlementInputSchema = z.object({
  swapId: z.string().describe('Swap transaction ID'),
  timeoutSeconds: z
    .number()
    .positive()
    .optional()
    .describe('Maximum wait time in seconds (default: 300)'),
});

export const getTokensInputSchema = z.object({
  chain: z.string().describe('Chain ID ("solana" or "base")'),
});

export type GetQuoteInput = z.infer<typeof getQuoteInputSchema>;
export type ExecuteSwapInput = z.infer<typeof executeSwapInputSchema>;
export type GetStatusInput = z.infer<typeof getStatusInputSchema>;
export type WaitForSettlementInput = z.infer<typeof waitForSettlementInputSchema>;
export type GetTokensInput = z.infer<typeof getTokensInputSchema>;
