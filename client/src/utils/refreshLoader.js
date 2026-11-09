export function isTransientRefreshError(error) {
  const response = error.response;
  if (!response) return error.code !== 'ERR_CANCELED';
  if ([401, 403].includes(response.status)) return false;
  if (response.data && typeof response.data === 'object') return false;
  return response.status === 400 || response.status === 408 || response.status === 429 || response.status >= 500;
}

export function createRefreshLoader({ request, onSuccess, onError, intervalMs = 30000, retryMs = 2000 }) {
  let stopped = false, active = null, timer = null, controller = null;
  const schedule = (fn, delay) => { clearTimeout(timer); timer = setTimeout(fn, delay); };
  const load = () => {
    if (stopped) return Promise.resolve();
    if (active) return active;
    clearTimeout(timer);
    active = (async () => {
      let retry = false;
      try {
        controller = new AbortController();
        const result = await request(controller.signal);
        if (!stopped) onSuccess(result);
      } catch (error) {
        if (!stopped) {
          retry = !retried && isTransientRefreshError(error);
          if (!retry) onError(error);
        }
      } finally {
        active = null;
        controller = null;
        if (!stopped) {
          retried = retry;
          schedule(load, retry ? retryMs : intervalMs);
        }
      }
    })();
    return active;
  };
  let retried = false;
  return {
    start: load,
    retry: () => { if (active) return active; retried = false; return load(); },
    stop: () => { stopped = true; clearTimeout(timer); controller?.abort(); },
  };
}
