# Background GET resilience

Polling inventory: DepartmentUserControl (/api/user-selection), TimeEntries (/api/time-entry-permissions), AppShell (/api/notifications), Projects (/api/auth/session-status and /api/admin/project-budget-change-requests). ProductTour timers only inspect DOM; mutation and navigation timers are not network polling.

The shared loader limits attempts to 15 seconds, serializes each loader, retries transient errors once after 2–2.5 seconds, and resumes the normal 30/60 second schedule after completion. Hidden/offline contexts suspend polling; online, focus and visible events request revalidation. Cleanup aborts requests, clears deadlines/timers and ignores obsolete results. HTTP 401/403 and structured validation 400 are not retried. HTTP 408/429/5xx and network failures are transient. No POST/PATCH/DELETE retries were added.

Permissions retain last day metadata but mark it unavailable after a failure, offline or hidden event. New scopes start unavailable. Only a fresh, structurally valid response restores editing. Calendar, hour inputs, submit and delete handlers fail closed; unsaved rows remain in memory. Server authorization remains authoritative.

Notifications and budget request data remain visible during transient failures; errors are shown only after recovery fails and clear after successful refresh. Session refresh preserves confirmed state during network failure; auth interceptors still handle revoked or expired sessions. Caddy, cache and keep-alive are unchanged.

This change provides application resilience, not a claimed repair of the external HTTP 400 origin. Production acceptance must include an authenticated browser, offline/online recovery, hidden/visible transitions, and a failed permissions refresh before attempting an edit.
