import type { ClawSwapConfig } from '../types';
import { ClawSwapError, NetworkError, TimeoutError, mapApiError } from '../errors';

/**
 * HTTP client with timeout and error handling
 */
export class HttpClient {
  private baseUrl: string;
  private fetch: typeof fetch;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: ClawSwapConfig) {
    this.baseUrl = config.baseUrl || 'https://api.clawswap.dev';
    this.fetch = config.fetch || globalThis.fetch.bind(globalThis);
    this.timeout = config.timeout || 30000;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Re-throw ClawSwapError instances without wrapping
      if (error instanceof ClawSwapError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError('Request timed out', 'Increase the timeout option');
        }
        throw new NetworkError(error.message);
      }

      throw error;
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: unknown;

    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: {
          code: 'NETWORK_ERROR',
          message: response.statusText || 'Unknown error occurred',
        },
      };
    }

    throw mapApiError(response.status, errorData);
  }
}
