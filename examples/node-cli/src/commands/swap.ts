/**
 * Swap command - execute a full cross-chain swap
 */

import { Command } from 'commander';
import { ClawSwapClient } from '@clawswap/sdk';
import { logger } from '../utils/logger.js';
import { createMockFetch } from '../utils/mock-payment.js';
import { parseTokenPair, isValidAmount } from '../utils/validators.js';
import { TEST_TOKENS } from '../utils/constants.js';
import { config } from '../config.js';

// Lazy imports for x402 (only loaded when swap command is executed)
async function setupPayment(chain: 'solana' | 'base', privateKey: string) {
  try {
    const { x402Client } = await import('@x402/core/client');
    const { wrapFetchWithPayment } = await import('@x402/fetch');

    // Create client - constructor expects a function or nothing, NOT an object
    const client = new x402Client();

    if (chain === 'solana') {
      if (!privateKey || privateKey.length < 32) {
        throw new Error('Invalid Solana private key format');
      }

      // Solana payment setup
      const { registerExactSvmScheme } = await import('@x402/svm/exact/client');
      const bs58 = await import('bs58');
      const { createKeyPairSignerFromBytes } = await import('@solana/signers');

      const secretKey = bs58.default.decode(privateKey);
      const signer = await createKeyPairSignerFromBytes(secretKey);

      registerExactSvmScheme(client, {
        signer: signer,
        networks: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'], // Solana mainnet genesis hash
        x402Versions: [2, 1], // Support x402 v2 and v1
      } as any);
    } else {
      if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
        throw new Error('Invalid EVM private key format (must be 0x-prefixed hex, 66 chars)');
      }

      // Base payment setup
      const { registerExactEvmScheme } = await import('@x402/evm/exact/client');
      const { privateKeyToAccount } = await import('viem/accounts');

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      registerExactEvmScheme(client, {
        signer: account,
        networks: ['eip155:8453'], // Base mainnet
        x402Versions: [2, 1], // Support x402 v2 and v1
      } as any);
    }

    return wrapFetchWithPayment(fetch, client);
  } catch (error) {
    throw new Error(
      `Failed to setup x402 payment on ${chain}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const swapCommand = new Command('swap')
  .description('Execute a full cross-chain swap (quote + execute + monitor)')
  .requiredOption('--from <chain:token>', 'Source chain and token (e.g., "solana:USDC")')
  .requiredOption('--to <chain:token>', 'Destination chain and token')
  .requiredOption('--amount <amount>', 'Amount to swap')
  .requiredOption('--destination <address>', 'Destination wallet address')
  .option('--sender <address>', 'Sender wallet address on source chain')
  .option('--payment-chain <chain>', 'Chain to pay x402 fee (solana|base)', 'solana')
  .option('--slippage <percent>', 'Slippage tolerance (0-1)', '0.01')
  .option('--mock', 'Use mock payment (no real wallet needed)')
  .action(async (options) => {
    try {
      // Parse and validate inputs
      const source = parseTokenPair(options.from);
      const dest = parseTokenPair(options.to);

      if (!isValidAmount(options.amount)) {
        throw new Error('Invalid amount. Must be a positive number.');
      }

      const slippage = parseFloat(options.slippage);
      if (isNaN(slippage) || slippage < 0 || slippage > 1) {
        throw new Error('Invalid slippage. Must be between 0 and 1.');
      }

      // Validate payment chain
      const paymentChain = options.paymentChain as 'solana' | 'base';
      if (!['solana', 'base'].includes(paymentChain)) {
        throw new Error('Payment chain must be "solana" or "base"');
      }

      // Resolve token shortcuts
      const sourceToken = resolveToken(source.chain, source.token);
      const destToken = resolveToken(dest.chain, dest.token);

      // Setup fetch with payment or mock
      let fetchWithPayment: typeof fetch;

      if (options.mock) {
        logger.warn('[MOCK MODE] Using mock payment - swap will not execute');
        fetchWithPayment = createMockFetch();
      } else {
        // Get the appropriate private key based on payment chain
        const privateKey = paymentChain === 'solana'
          ? config.SOLANA_PRIVATE_KEY
          : config.EVM_PRIVATE_KEY;

        if (!privateKey) {
          const keyName = paymentChain === 'solana' ? 'SOLANA_PRIVATE_KEY' : 'EVM_PRIVATE_KEY';
          throw new Error(
            `${keyName} not set in environment. Use --mock flag to test without wallet.`
          );
        }

        logger.info(`Setting up x402 payment on ${paymentChain}...`);
        fetchWithPayment = await setupPayment(paymentChain, privateKey);
        logger.success(`x402 payment configured on ${paymentChain}`);
      }

      const client = new ClawSwapClient({
        fetch: fetchWithPayment,
        baseUrl: config.API_URL,
      });

      // STEP 1: Get quote
      console.log();
      logger.info('Step 1/3: Getting quote...');
      const quote = await client.getQuote({
        sourceChainId: source.chain,
        sourceTokenAddress: sourceToken,
        destinationChainId: dest.chain,
        destinationTokenAddress: destToken,
        amount: options.amount,
        senderAddress: options.sender || 'default-sender',
        recipientAddress: options.destination,
        slippageTolerance: slippage,
      });

      logger.success(`Quote received: ${quote.destinationAmount} tokens`);
      logger.warn(`Quote expires in ${quote.expiresIn} seconds`);
      logger.table({
        'Quote ID': quote.quoteId,
        'Total Fee': `$${quote.fees.totalEstimatedFeeUsd}`,
        'Estimated Time': `${quote.estimatedTimeSeconds}s`,
      });

      // STEP 2: Execute swap
      console.log();
      logger.info('Step 2/3: Executing swap...');

      if (options.mock) {
        logger.warn('[MOCK MODE] Skipping actual swap execution');
        logger.info('In real mode, this would:');
        console.log('  1. Pay $0.50 USDC via x402');
        console.log('  2. Initiate the cross-chain swap');
        console.log('  3. Monitor status until completion');
        return;
      }

      // Execute swap with v2 API (no need for getTokenInfo - API handles it)
      const executeResponse = await client.executeSwap({
        sourceChainId: source.chain,
        sourceTokenAddress: sourceToken,
        destinationChainId: dest.chain,
        destinationTokenAddress: destToken,
        amount: options.amount,
        senderAddress: options.sender || 'default-sender',
        recipientAddress: options.destination,
        slippageTolerance: slippage,
      });

      logger.success(`Swap transaction received!`);
      logger.table({
        'Order ID': executeResponse.orderId,
        'Transaction Size': `${executeResponse.transaction.length} bytes`,
        'Gas Reimbursement': executeResponse.accounting.gasReimbursement.amountFormatted,
        'x402 Fee (USD)': `$${executeResponse.accounting.x402Fee.amountUsd}`,
        'Is Token-2022': executeResponse.isToken2022 ? 'Yes' : 'No',
      });

      console.log();
      logger.info('Step 2b: Signing and submitting transaction...');

      // Decode, sign, and submit transaction
      const bs58 = await import('bs58');
      const { Connection, Transaction, Keypair } = await import('@solana/web3.js');

      // Get private key for transaction signing (same as payment key)
      const signingKey = paymentChain === 'solana'
        ? config.SOLANA_PRIVATE_KEY
        : config.SOLANA_PRIVATE_KEY; // For now, always use Solana key for tx signing

      if (!signingKey) {
        throw new Error('SOLANA_PRIVATE_KEY not set for transaction signing');
      }

      // Decode transaction from base64
      const txBuffer = Buffer.from(executeResponse.transaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      logger.info(`Transaction has ${transaction.signatures.length} signature slots`);
      logger.info(`Instructions: ${transaction.instructions.length}`);

      // Log transaction details
      console.log('\nTransaction Structure:');
      console.log(`  Recent Blockhash: ${transaction.recentBlockhash}`);
      console.log(`  Fee Payer: ${transaction.feePayer?.toBase58()}`);
      console.log(`\nSignature Slots:`);
      transaction.signatures.forEach((sig, i) => {
        console.log(`  ${i}: ${sig.publicKey.toBase58()} - ${sig.signature ? 'SIGNED' : 'UNSIGNED'}`);
      });

      console.log(`\nInstructions:`);
      transaction.instructions.forEach((ix, i) => {
        console.log(`  Instruction ${i}:`);
        console.log(`    Program: ${ix.programId.toBase58()}`);
        console.log(`    Accounts: ${ix.keys.length}`);
        console.log(`    Data length: ${ix.data.length} bytes`);
        ix.keys.forEach((key, j) => {
          console.log(`      ${j}: ${key.pubkey.toBase58()} ${key.isSigner ? '[SIGNER]' : ''} ${key.isWritable ? '[WRITABLE]' : ''}`);
        });
      });
      console.log();

      // Sign with user's keypair (using legacy web3.js since transaction is in legacy format)
      const secretKey = bs58.default.decode(signingKey);
      const keypair = Keypair.fromSecretKey(secretKey);

      logger.info(`Signing with pubkey: ${keypair.publicKey.toBase58()}`);
      logger.info(`Expected sender: ${options.sender}`);

      // Verify we're signing with the correct key
      if (keypair.publicKey.toBase58() !== options.sender) {
        throw new Error(
          `Key mismatch! Private key is for ${keypair.publicKey.toBase58()} but sender is ${options.sender}`
        );
      }

      // Add user signature to partially-signed transaction
      transaction.partialSign(keypair);

      logger.info('Transaction signed, preparing to submit...');

      // Submit to Solana RPC
      logger.info('Connecting to Solana mainnet...');
      const connection = new Connection(
        'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      const serialized = transaction.serialize();
      logger.info('Submitting transaction to Solana...');

      try {
        const signature = await connection.sendRawTransaction(serialized, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        logger.success(`Transaction submitted!`);
        console.log();
        logger.table({
          'Transaction Signature': signature,
          'Solscan': `https://solscan.io/tx/${signature}`,
          'Explorer': `https://explorer.solana.com/tx/${signature}`,
        });

        console.log();
        logger.info('⏳ Waiting for transaction confirmation...');

        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        logger.success('✅ Transaction confirmed on Solana!');
        console.log();
      } catch (error: any) {
        // Enhanced error handling for SendTransactionError
        if (error.logs) {
          logger.error('Transaction simulation logs:');
          error.logs.forEach((log: string) => console.log(`  ${log}`));
        }
        throw error;
      }


      // STEP 3: Monitor status (using order ID from execute response)
      console.log();
      logger.info('Step 3/3: Monitoring swap status...');
      logger.info('This may take several minutes depending on network congestion');
      console.log();

      const result = await client.waitForSettlement(executeResponse.orderId, {
        timeout: 300000, // 5 minutes
        interval: 3000, // 3 seconds
        onStatusUpdate: (status) => {
          logger.info(`Status: ${status.status}`);

          // Show transaction hashes if available
          if (status.sourceTxHash) {
            console.log(`  Source TX: ${status.sourceTxHash}`);
          }
          if (status.destinationTxHash) {
            console.log(`  Destination TX: ${status.destinationTxHash}`);
          }
          if (status.explorerUrl) {
            console.log(`  Explorer: ${status.explorerUrl}`);
          }
        },
      });

      console.log();
      if (result.status === 'fulfilled' || result.status === 'completed') {
        logger.success('✨ Swap completed successfully!');
        logger.table({
          'Order ID': result.orderId,
          'Status': result.status,
          'Source Amount': result.sourceAmount,
          'Destination Amount': result.destinationAmount,
          'Destination Address': options.destination,
        });

        if (result.explorerUrl) {
          console.log();
          logger.info(`View on explorer: ${result.explorerUrl}`);
        }
      } else {
        logger.error(`Swap ${result.status}`);
        if (result.failureReason) {
          logger.error(`Reason: ${result.failureReason}`);
        }
        process.exit(1);
      }

    } catch (error) {
      logger.error('Swap failed:', error);
      process.exit(1);
    }
  });

/**
 * Resolve token shortcuts like "USDC" to full addresses
 */
function resolveToken(chain: string, token: string): string {
  // If already a full address, return as-is
  if (token.length > 10) {
    return token;
  }

  // Try to resolve from TEST_TOKENS
  const chainTokens = TEST_TOKENS[chain as keyof typeof TEST_TOKENS];
  if (chainTokens) {
    const resolved = chainTokens[token as keyof typeof chainTokens];
    if (resolved) {
      return resolved;
    }
  }

  // Fallback to original token
  return token;
}
