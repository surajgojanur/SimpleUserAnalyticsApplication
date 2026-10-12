import { useEffect, useState } from 'react';
export function useAsync(load) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    setState({ loading: true, data: null, error: null });
    Promise.resolve().then(() => load(controller.signal))
      .then(data => { if (live) setState({ loading: false, data, error: null }); })
      .catch(error => { if (live) setState({ loading: false, data: null, error: error.message }); });
    return () => { live = false; controller.abort(); };
  }, [load]);
  return state;
}
