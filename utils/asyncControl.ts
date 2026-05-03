import { ApiClientError } from './apiClient';

export function isAbortSignalCancelled(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

export function createCancelledError(message = '操作已取消'): ApiClientError {
  return new ApiClientError(message, 'REQUEST_CANCELLED');
}

export function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createCancelledError();
  }
}

export function isCancelledError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'REQUEST_CANCELLED';
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfCancelled(signal);

  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(createCancelledError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
