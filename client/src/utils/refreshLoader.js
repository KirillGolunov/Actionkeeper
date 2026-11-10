export function isTransientRefreshError(error) {
  const response = error.response;
  if (!response) return error.code !== 'ERR_CANCELED';
  if ([401, 403].includes(response.status)) return false;
  if (response.status === 400 && response.data && typeof response.data === 'object') return false;
  return response.status === 400 || response.status === 408 || response.status === 429 || response.status >= 500;
}

export function createRefreshLoader({ request, onSuccess, onError, intervalMs = 30000, retryMs = 2000, timeoutMs = 15000, jitterMs = 500, onUnavailable = () => {}, environment = typeof window === 'undefined' ? null : window }) {
  let stopped = false, active = null, timer = null, controller = null, generation = 0;
  const available = () => !environment || (environment.navigator?.onLine !== false && environment.document?.visibilityState !== 'hidden');
  const schedule = (fn, delay) => { clearTimeout(timer); timer = setTimeout(fn, delay); };
  const load = () => {
    if (stopped || !available()) return Promise.resolve();
    if (active) return active;
    clearTimeout(timer);
    active = (async () => {
      let retry = false, deadline;
      const attemptGeneration = generation;
      try {
        controller = new AbortController();
        const attemptController = controller;
        const result = await Promise.race([
          Promise.resolve().then(() => request(attemptController.signal)),
          new Promise((_, reject) => { deadline = setTimeout(() => {
            const error = Object.assign(new Error('Background GET timed out'), { code: 'ETIMEDOUT' });
            reject(error); attemptController.abort();
          }, timeoutMs); }),
        ]);
        if (!stopped && attemptGeneration === generation && available()) onSuccess(result);
      } catch (error) {
        if (!stopped && attemptGeneration === generation) {
          onUnavailable(error);
          retry = !retried && isTransientRefreshError(error);
          if (!retry) onError(error);
        }
      } finally {
        clearTimeout(deadline);
        active = null;
        controller = null;
        if (!stopped) {
          retried = retry;
          schedule(load, attemptGeneration !== generation && available() ? 0 : retry ? retryMs + Math.floor(Math.random() * jitterMs) : intervalMs);
        }
      }
    })();
    return active;
  };
  let retried = false;
  const resume = () => { if (available()) { if (!active) retried = false; load(); } };
  const unavailable = () => { if (!available()) { clearTimeout(timer); generation++; controller?.abort(); onUnavailable(); } };
  environment?.addEventListener('online', resume);
  environment?.addEventListener('offline', unavailable);
  environment?.addEventListener('focus', resume);
  const visibility = () => { if (available()) resume(); else unavailable(); };
  environment?.document?.addEventListener('visibilitychange', visibility);
  return {
    start: load,
    retry: () => { if (active) return active; retried = false; return load(); },
    stop: () => {
      stopped = true; clearTimeout(timer); controller?.abort();
      environment?.removeEventListener('online', resume);
      environment?.removeEventListener('offline', unavailable);
      environment?.removeEventListener('focus', resume);
      environment?.document?.removeEventListener('visibilitychange', visibility);
    },
  };
}
