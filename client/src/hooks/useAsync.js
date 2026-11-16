import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async function and tracks { data, error, loading }.
 * `reload()` re-runs it. Results from stale calls are ignored.
 */
export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const callId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- callers control re-runs through `deps`
  const run = useCallback(asyncFn, deps);

  const load = useCallback(async () => {
    const id = ++callId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await run();
      if (id === callId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === callId.current) setState((prev) => ({ ...prev, error, loading: false }));
      return undefined;
    }
  }, [run]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
