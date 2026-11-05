'use strict';
// Handlers must return a Promise covering ALL database work, including callbacks.
function createRequestQueue({ before = async () => true, log = record => console.info('[RequestQueue]', JSON.stringify(record)) } = {}) {
  let tail = Promise.resolve();
  let pending = 0;
  return handler => (req, res, next) => {
    const queuedAt = Date.now();
    const path = req.route?.path || req.path;
    pending++;
    const job = tail.then(async () => {
      const startedAt = Date.now();
      let outcome = 'completed';
      try {
        if (res.destroyed || res.writableEnded) { outcome = 'skipped_closed'; return; }
        if (await before(req, res)) await handler(req, res, next);
      } catch (error) {
        outcome = 'error';
        throw error;
      } finally {
        pending--;
        log({ method: req.method, path, outcome, waitMs: startedAt - queuedAt, runMs: Date.now() - startedAt, pending });
      }
    });
    tail = job.catch(() => {});
    return job.catch(next);
  };
}
module.exports = { createRequestQueue };
