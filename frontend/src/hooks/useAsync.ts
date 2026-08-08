import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

// Tiny generic loader hook. Reload via the returned `reload` fn.
// The loader may either ignore the abort signal entirely or use it to
// cancel an in-flight request when the component unmounts or deps change.
export function useAsync<T>(
  loader: () => Promise<T>,
  deps?: ReadonlyArray<unknown>,
): AsyncState<T> & { reload: () => void };
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps?: ReadonlyArray<unknown>,
): AsyncState<T> & { reload: () => void };
export function useAsync<T>(
  loader: (() => Promise<T>) | ((signal: AbortSignal) => Promise<T>),
  deps: ReadonlyArray<unknown> = [],
): AsyncState<T> & { reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loader(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) {
          setError(err);
        } else {
          setError(
            new ApiError(
              0,
              'INTERNAL',
              err instanceof Error ? err.message : 'Unknown error',
              null,
            ),
          );
        }
        setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, reload };
}