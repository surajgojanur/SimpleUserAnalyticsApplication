import { useEffect, useState } from 'react';

export function useAsync(load, { refreshMs = 0 } = {}) {
  const empty = { loading: true, data: null, error: null, lastUpdatedAt: null };
  const [state, setState] = useState({ ...empty, source: load });

  useEffect(() => {
    let active = true;
    let pending = false;
    let controller = null;

    async function reload(initial = false) {
      if (!active || pending) return;
      if (!initial && typeof document !== 'undefined' && document.visibilityState === 'hidden')
        return;

      const request = new AbortController();
      controller = request;
      pending = true;
      if (initial)
        setState({ loading: true, data: null, error: null, lastUpdatedAt: null, source: load });
      try {
        const data = await load(request.signal);
        if (active && !request.signal.aborted)
          setState({
            source: load,
            loading: false,
            data,
            error: null,
            lastUpdatedAt: data === null ? null : new Date().toISOString(),
          });
      } catch (error) {
        if (active && !request.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            data: initial ? null : previous.data,
            error: String(error?.message || error),
          }));
      } finally {
        pending = false;
        if (controller === request) controller = null;
      }
    }

    void reload(true);
    const timer = refreshMs > 0 ? setInterval(() => void reload(), refreshMs) : null;
    const onReturn = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void reload();
    };
    if (refreshMs > 0) {
      document.addEventListener('visibilitychange', onReturn);
      window.addEventListener('focus', onReturn);
    }

    return () => {
      active = false;
      controller?.abort();
      if (timer !== null) clearInterval(timer);
      if (refreshMs > 0) {
        document.removeEventListener('visibilitychange', onReturn);
        window.removeEventListener('focus', onReturn);
      }
    };
  }, [load, refreshMs]);

  return state.source === load ? state : empty;
}
