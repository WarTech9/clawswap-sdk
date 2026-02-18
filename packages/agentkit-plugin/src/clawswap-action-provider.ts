import { ClawSwapClient } from '@clawswap/sdk';
import {
  getQuoteInputSchema,
  executeSwapInputSchema,
  getStatusInputSchema,
  waitForSettlementInputSchema,
  getTokensInputSchema,
  type GetQuoteInput,
  type ExecuteSwapInput,
  type GetStatusInput,
  type WaitForSettlementInput,
  type GetTokensInput,
} from './schemas';
import { z } from 'zod';

/**
 * ClawSwap Action Provider for Coinbase AgentKit
 *
 * Provides cross-chain swap actions for AI agents using ClawSwap.
 *
 * @example
 * ```typescript
 * import { clawSwapActionProvider } from '@clawswap/agentkit-plugin';
 * import { AgentKit } from '@coinbase/agentkit';
 *
 * const agentKit = await AgentKit.from({
 *   walletProvider,
 *   actionProviders: [clawSwapActionProvider()],
 * });
 * ```
 */
export class ClawSwapActionProvider {
  private client: ClawSwapClient;

  constructor(fetchWithPayment: typeof fetch) {
    // Initialize ClawSwap client with x402-wrapped fetch
    this.client = new ClawSwapClient({
      fetch: fetchWithPayment,
    });
  }

  /**
   * Get action definitions for AgentKit
   * This would be called by AgentKit to register actions
   */
  getActions() {
    return [
      {
        name: 'clawswap_get_quote',
        description: 'Get a quote for swapping tokens across blockchains using ClawSwap',
        schema: getQuoteInputSchema,
        handler: this.getQuote.bind(this),
      },
      {
        name: 'clawswap_execute_swap',
        description:
          'Execute a cross-chain token swap using ClawSwap (requires $0.50 USDC payment)',
        schema: executeSwapInputSchema,
        handler: this.executeSwap.bind(this),
      },
      {
        name: 'clawswap_get_status',
        description: 'Check the status of a ClawSwap transaction',
        schema: getStatusInputSchema,
        handler: this.getStatus.bind(this),
      },
      {
        name: 'clawswap_wait_for_settlement',
        description:
          'Wait for a ClawSwap transaction to complete (polls until completed/failed/expired)',
        schema: waitForSettlementInputSchema,
        handler: this.waitForSettlement.bind(this),
      },
      {
        name: 'clawswap_get_chains',
        description: 'Get list of blockchain networks supported by ClawSwap',
        schema: z.object({}),
        handler: this.getChains.bind(this),
      },
      {
        name: 'clawswap_get_tokens',
        description: 'Get list of tokens supported on a specific blockchain',
        schema: getTokensInputSchema,
        handler: this.getTokens.bind(this),
      },
    ];
  }

  /**
   * Get a quote for a cross-chain swap
   */
  async getQuote(input: GetQuoteInput): Promise<string> {
    const quote = await this.client.getQuote({
      sourceChainId: input.sourceChain,
      sourceTokenAddress: input.sourceToken,
      destinationChainId: input.destinationChain,
      destinationTokenAddress: input.destinationToken,
      amount: input.amount,
      senderAddress: input.senderAddress,
      recipientAddress: input.recipientAddress,
      slippageTolerance: input.slippageTolerance,
    });

    return JSON.stringify(
      {
        quoteId: quote.quoteId,
        sourceAmount: quote.sourceAmount,
        destinationAmount: quote.destinationAmount,
        totalEstimatedFeeUsd: quote.fees.totalEstimatedFeeUsd,
        expiresIn: quote.expiresIn,
        message: `Quote received: ${quote.destinationAmount} tokens on ${input.destinationChain}. Fee: $${quote.fees.totalEstimatedFeeUsd}. Expires in ${quote.expiresIn}s.`,
      },
      null,
      2
    );
  }

  /**
   * Execute a cross-chain swap
   */
  async executeSwap(input: ExecuteSwapInput): Promise<string> {
    // First, get a quote
    const quote = await this.client.getQuote({
      sourceChainId: input.sourceChain,
      sourceTokenAddress: input.sourceToken,
      destinationChainId: input.destinationChain,
      destinationTokenAddress: input.destinationToken,
      amount: input.amount,
      senderAddress: input.senderAddress,
      recipientAddress: input.recipientAddress,
      slippageTolerance: input.slippageTolerance,
    });

    // Execute swap
    const swap = await this.client.executeSwap({
      sourceChainId: input.sourceChain,
      sourceTokenAddress: input.sourceToken,
      destinationChainId: input.destinationChain,
      destinationTokenAddress: input.destinationToken,
      amount: input.amount,
      senderAddress: input.senderAddress,
      recipientAddress: input.recipientAddress,
      slippageTolerance: input.slippageTolerance,
    });

    return JSON.stringify(
      {
        orderId: swap.orderId,
        isToken2022: swap.isToken2022,
        message: `Swap initiated! Order ID: ${swap.orderId}. Use clawswap_get_status to check progress.`,
      },
      null,
      2
    );
  }

  /**
   * Get the status of a swap
   */
  async getStatus(input: GetStatusInput): Promise<string> {
    const status = await this.client.getStatus(input.swapId);

    return JSON.stringify(
      {
        orderId: status.orderId,
        status: status.status,
        destinationAmount: status.destinationAmount,
        sourceTxHash: status.sourceTxHash,
        destinationTxHash: status.destinationTxHash,
        message: `Swap status: ${status.status}`,
      },
      null,
      2
    );
  }

  /**
   * Wait for swap to complete
   */
  async waitForSettlement(input: WaitForSettlementInput): Promise<string> {
    const result = await this.client.waitForSettlement(input.swapId, {
      timeout: (input.timeoutSeconds || 300) * 1000,
      onStatusUpdate: (status) => {
        console.log(`[ClawSwap] Status update: ${status.status}`);
      },
    });

    return JSON.stringify(
      {
        orderId: result.orderId,
        status: result.status,
        destinationAmount: result.destinationAmount,
        sourceTxHash: result.sourceTxHash,
        destinationTxHash: result.destinationTxHash,
        message:
          result.status === 'completed' || result.status === 'fulfilled'
            ? `Swap completed successfully! Received ${result.destinationAmount} tokens.`
            : `Swap ${result.status}. ${result.failureReason || ''}`,
      },
      null,
      2
    );
  }

  /**
   * Get supported chains
   */
  async getChains(): Promise<string> {
    const chains = await this.client.getSupportedChains();

    return JSON.stringify(
      {
        chains: chains.map((c) => ({
          id: c.id,
          name: c.name,
          nativeToken: c.nativeCurrency.symbol,
        })),
        message: `${chains.length} chains supported: ${chains.map((c) => c.name).join(', ')}`,
      },
      null,
      2
    );
  }

  /**
   * Get supported tokens for a chain
   */
  async getTokens(input: GetTokensInput): Promise<string> {
    const tokens = await this.client.getSupportedTokens(input.chain);

    return JSON.stringify(
      {
        chain: input.chain,
        tokens: tokens.map((t) => ({
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
        })),
        message: `${tokens.length} tokens supported on ${input.chain}`,
      },
      null,
      2
    );
  }
}

/**
 * Factory function to create ClawSwap action provider
 *
 * Note: This is a simplified version. The actual integration with AgentKit
 * may require additional setup based on the specific AgentKit API.
 */
export function clawSwapActionProvider() {
  return (fetchWithPayment: typeof fetch) => new ClawSwapActionProvider(fetchWithPayment);
}
