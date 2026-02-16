import type { StatusResponse, WaitForSettlementOptions } from '../types';
import { TimeoutError } from '../errors';

/**
 * Poll function with configurable timeout and interval
 */
export async function poll<T>(
  fn: () => Promise<T>,
  shouldContinue: (result: T) => boolean,
  options: WaitForSettlementOptions = {}
): Promise<T> {
  const { timeout = 300000, interval = 3000 } = options;
  const startTime = Date.now();

  while (true) {
    const result = await fn();

    if (!shouldContinue(result)) {
      return result;
    }

    if (Date.now() - startTime > timeout) {
      throw new TimeoutError('Polling timed out', {
        timeoutMs: timeout,
        elapsedMs: Date.now() - startTime,
      });
    }

    await sleep(interval);
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if swap is in terminal state
 * Terminal statuses from Relay API: fulfilled, completed, failed, cancelled
 */
export function isTerminalStatus(status: StatusResponse['status']): boolean {
  return ['fulfilled', 'completed', 'failed', 'cancelled'].includes(status);
}
