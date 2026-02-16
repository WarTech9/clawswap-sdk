import { describe, it, expect, vi } from 'vitest';
import { poll, sleep, isTerminalStatus } from '../src/utils/polling';
import type { StatusResponse } from '../src/types';
import { TimeoutError } from '../src/errors';

describe('Polling Utilities', () => {
  describe('sleep', () => {
    it('should sleep for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for completed status', () => {
      expect(isTerminalStatus('completed')).toBe(true);
    });

    it('should return true for failed status', () => {
      expect(isTerminalStatus('failed')).toBe(true);
    });

    it('should return true for expired status', () => {
      expect(isTerminalStatus('expired')).toBe(true);
    });

    it('should return false for pending status', () => {
      expect(isTerminalStatus('pending')).toBe(false);
    });

    it('should return false for bridging status', () => {
      expect(isTerminalStatus('bridging')).toBe(false);
    });

    it('should return false for settling status', () => {
      expect(isTerminalStatus('settling')).toBe(false);
    });
  });

  describe('poll', () => {
    it('should poll until condition is met', async () => {
      let count = 0;
      const mockFn = vi.fn(async () => {
        count++;
        return count;
      });

      const result = await poll(mockFn, (val) => val < 3, {
        interval: 10,
      });

      expect(result).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should stop immediately if condition is false', async () => {
      const mockFn = vi.fn(async () => 'result');

      const result = await poll(mockFn, () => false, { interval: 10 });

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should timeout after specified duration', async () => {
      const mockFn = vi.fn(async () => 'never-done');

      await expect(
        poll(mockFn, () => true, { timeout: 100, interval: 10 })
      ).rejects.toThrow(TimeoutError);

      expect(mockFn.mock.calls.length).toBeGreaterThan(5);
    });

    it('should use default timeout and interval', async () => {
      let count = 0;
      const mockFn = vi.fn(async () => {
        count++;
        return count;
      });

      const result = await poll(mockFn, (val) => val < 2);

      expect(result).toBe(2);
    });

    it('should include timeout details in error', async () => {
      const mockFn = vi.fn(async () => 'pending');

      try {
        await poll(mockFn, () => true, { timeout: 50, interval: 10 });
        expect.fail('Should have thrown TimeoutError');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        if (error instanceof TimeoutError) {
          expect(error.details?.timeoutMs).toBe(50);
          expect(error.details?.elapsedMs).toBeGreaterThanOrEqual(50);
        }
      }
    });

    it('should handle async functions with delays', async () => {
      let status: StatusResponse['status'] = 'pending';
      const mockFn = vi.fn(async () => {
        await sleep(5);
        if (status === 'pending') status = 'bridging';
        else if (status === 'bridging') status = 'completed';
        return { status } as StatusResponse;
      });

      const result = await poll(mockFn, (res) => !isTerminalStatus(res.status), {
        interval: 10,
      });

      expect(result.status).toBe('completed');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });
});
