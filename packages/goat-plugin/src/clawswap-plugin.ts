import { ClawSwapClient } from '@clawswap/sdk';
import {
  getQuoteParametersSchema,
  executeSwapParametersSchema,
  getStatusParametersSchema,
  waitForSettlementParametersSchema,
  getTokensParametersSchema,
  type GetQuoteParameters,
  type ExecuteSwapParameters,
  type GetStatusParameters,
  type WaitForSettlementParameters,
  type GetTokensParameters,
} from './parameters';
import { z } from 'zod';

/**
 * ClawSwap Plugin for GOAT SDK
 *
 * Provides cross-chain swap tools for AI agents using ClawSwap.
 *
 * @example
 * ```typescript
 * import { clawSwap } from '@clawswap/goat-plugin';
 * import { getOnChainTools } from '@goat-sdk/core';
 * import { viem } from '@goat-sdk/wallet-viem';
 *
 * const tools = getOnChainTools({
 *   wallet: viem(walletClient),
 *   plugins: [clawSwap()],
 * });
 * ```
 */
export class ClawSwapPlugin {
  private client: ClawSwapClient;

  constructor(fetchWithPayment: typeof fetch) {
    // Initialize ClawSwap client with x402-wrapped fetch
    this.client = new ClawSwapClient({
      fetch: fetchWithPayment,
    });
  }

  /**
   * Check if this plugin supports a given chain
   */
  supportsChain(chain: string): boolean {
    // ClawSwap supports multiple chains - validation happens server-side
    return true;
  }

  /**
   * Get all tools provided by this plugin
   */
  getTools() {
    return [
      {
        name: 'clawswap_get_quote',
        description: 'Get a quote for swapping tokens across blockchains using ClawSwap',
        parameters: getQuoteParametersSchema,
        handler: this.getQuote.bind(this),
      },
      {
        name: 'clawswap_execute_swap',
        description:
          'Execute a cross-chain token swap using ClawSwap (requires $0.50 USDC payment)',
        parameters: executeSwapParametersSchema,
        handler: this.executeSwap.bind(this),
      },
      {
        name: 'clawswap_get_status',
        description: 'Check the status of a ClawSwap transaction',
        parameters: getStatusParametersSchema,
        handler: this.getStatus.bind(this),
      },
      {
        name: 'clawswap_wait_for_settlement',
        description: 'Wait for a ClawSwap transaction to complete',
        parameters: waitForSettlementParametersSchema,
        handler: this.waitForSettlement.bind(this),
      },
      {
        name: 'clawswap_get_chains',
        description: 'Get list of blockchain networks supported by ClawSwap',
        parameters: z.object({}),
        handler: this.getChains.bind(this),
      },
      {
        name: 'clawswap_get_tokens',
        description: 'Get list of tokens supported on a specific blockchain',
        parameters: getTokensParametersSchema,
        handler: this.getTokens.bind(this),
      },
    ];
  }

  async getQuote(parameters: GetQuoteParameters) {
    const quote = await this.client.getQuote({
      sourceChainId: parameters.sourceChain,
      sourceTokenAddress: parameters.sourceToken,
      destinationChainId: parameters.destinationChain,
      destinationTokenAddress: parameters.destinationToken,
      amount: parameters.amount,
      senderAddress: parameters.senderAddress,
      recipientAddress: parameters.recipientAddress,
    });

    return {
      id: quote.id,
      sourceAmount: quote.sourceAmount,
      destinationAmount: quote.destinationAmount,
      totalFeeUsd: quote.fees.totalFeeUsd,
      expiresIn: quote.expiresIn,
      message: `Quote: ${quote.destinationAmount} tokens. Fee: $${quote.fees.totalFeeUsd}. Expires in ${quote.expiresIn}s.`,
    };
  }

  async executeSwap(parameters: ExecuteSwapParameters) {
    // First, get a quote
    const quote = await this.client.getQuote({
      sourceChainId: parameters.sourceChain,
      sourceTokenAddress: parameters.sourceToken,
      destinationChainId: parameters.destinationChain,
      destinationTokenAddress: parameters.destinationToken,
      amount: parameters.amount,
      senderAddress: parameters.senderAddress,
      recipientAddress: parameters.recipientAddress,
      slippageTolerance: parameters.slippageTolerance,
    });

    // Get token info for decimals
    const sourceToken = await this.client.getTokenInfo(
      parameters.sourceChain,
      parameters.sourceToken
    );

    // Execute swap with full quote and context
    const swap = await this.client.executeSwap({
      quote: quote,
      userWallet: parameters.senderAddress,
      sourceTokenMint: parameters.sourceToken,
      sourceTokenDecimals: sourceToken.decimals,
    });

    return {
      swapId: swap.swapId,
      status: swap.status,
      message: `Swap initiated! ID: ${swap.swapId}. Status: ${swap.status}.`,
    };
  }

  async getStatus(parameters: GetStatusParameters) {
    const status = await this.client.getStatus(parameters.swapId);

    return {
      swapId: status.swapId,
      status: status.status,
      destinationAmount: status.destinationAmount,
      transactions: status.transactions,
      message: `Swap status: ${status.status}`,
    };
  }

  async waitForSettlement(parameters: WaitForSettlementParameters) {
    const result = await this.client.waitForSettlement(parameters.swapId, {
      timeout: (parameters.timeoutSeconds || 300) * 1000,
    });

    return {
      swapId: result.swapId,
      status: result.status,
      destinationAmount: result.destinationAmount,
      message:
        result.status === 'completed'
          ? `Swap completed! Received ${result.destinationAmount} tokens.`
          : `Swap ${result.status}.`,
    };
  }

  async getChains() {
    const chains = await this.client.getSupportedChains();

    return {
      chains: chains.map((c) => ({
        id: c.id,
        name: c.name,
        nativeToken: c.nativeToken.symbol,
      })),
      message: `${chains.length} chains supported`,
    };
  }

  async getTokens(parameters: GetTokensParameters) {
    const tokens = await this.client.getSupportedTokens(parameters.chain);

    return {
      chain: parameters.chain,
      tokens: tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
      })),
      message: `${tokens.length} tokens on ${parameters.chain}`,
    };
  }
}

/**
 * Factory function to create ClawSwap plugin
 *
 * Note: This is a simplified version. The actual integration with GOAT SDK
 * may require extending PluginBase class and using @Tool decorators.
 */
export function clawSwap() {
  return (fetchWithPayment: typeof fetch) => new ClawSwapPlugin(fetchWithPayment);
}
