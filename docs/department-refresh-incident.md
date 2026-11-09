# Department refresh incident, 2026-11-09

Transport source remains unconfirmed. At 12:07:56 UTC backend logs contain permissions but not the failing user-selection request. Proxy access logs were unavailable. Plain-text 400 responses close the connection and lack Via; later identical requests succeed. Do not disable ETag or keep-alive without evidence.

## Sanitized HAR chronology (Europe/Moscow)

| Time | Path | Status | ms |
|---|---|---|---|
| 2026-11-09T15:07:26.034000+03:00 | /api/auth/session-status | 304 | 88.7 |
| 2026-11-09T15:07:26.343000+03:00 | /api/setup-required | 304 | 33.6 |
| 2026-11-09T15:07:26.344000+03:00 | /api/product-updates/department-support-v1 | 304 | 60.7 |
| 2026-11-09T15:07:26.346000+03:00 | /api/user-selection | 200 | 145.7 |
| 2026-11-09T15:07:26.347000+03:00 | /api/projects | 304 | 216.9 |
| 2026-11-09T15:07:26.347000+03:00 | /api/notifications | 304 | 214.6 |
| 2026-11-09T15:07:26.418000+03:00 | /api/dashboard | 304 | 166.1 |
| 2026-11-09T15:07:26.418000+03:00 | /api/time-entries | 304 | 165.3 |
| 2026-11-09T15:07:26.419000+03:00 | /api/time-entries | 304 | 171.9 |
| 2026-11-09T15:07:26.420000+03:00 | /api/projects | 304 | 275.0 |
| 2026-11-09T15:07:26.420000+03:00 | /api/time-entry-permissions | 304 | 240.9 |
| 2026-11-09T15:07:56.314000+03:00 | /api/user-selection | 400 | 5.6 |
| 2026-11-09T15:07:56.426000+03:00 | /api/time-entry-permissions | 304 | 134.8 |
| 2026-11-09T15:08:26.304000+03:00 | /api/user-selection | 200 | 112.6 |
| 2026-11-09T15:08:26.307000+03:00 | /api/notifications | 304 | 120.0 |
| 2026-11-09T15:08:26.419000+03:00 | /api/time-entry-permissions | 304 | 49.4 |
| 2026-11-09T15:08:56.306000+03:00 | /api/user-selection | 304 | 192.5 |
| 2026-11-09T15:08:56.426000+03:00 | /api/time-entry-permissions | 304 | 115.3 |
| 2026-11-09T15:09:26.308000+03:00 | /api/user-selection | 304 | 83.8 |
| 2026-11-09T15:09:26.310000+03:00 | /api/notifications | 304 | 113.6 |
| 2026-11-09T15:09:26.425000+03:00 | /api/time-entry-permissions | 304 | 43.2 |
| 2026-11-09T15:09:56.312000+03:00 | /api/user-selection | 304 | 133.5 |
| 2026-11-09T15:09:56.423000+03:00 | /api/time-entry-permissions | 304 | 73.2 |
| 2026-11-09T15:10:26.312000+03:00 | /api/user-selection | 304 | 118.7 |
| 2026-11-09T15:10:26.314000+03:00 | /api/notifications | 304 | 147.4 |
| 2026-11-09T15:10:26.423000+03:00 | /api/time-entry-permissions | 304 | 77.4 |
| 2026-11-09T15:10:56.303000+03:00 | /api/user-selection | 304 | 498.1 |
| 2026-11-09T15:10:56.420000+03:00 | /api/time-entry-permissions | 304 | 434.7 |
| 2026-11-09T15:11:26.303000+03:00 | /api/user-selection | 304 | 404.6 |
| 2026-11-09T15:11:26.305000+03:00 | /api/notifications | 304 | 210.9 |
| 2026-11-09T15:11:26.425000+03:00 | /api/time-entry-permissions | 304 | 142.3 |
| 2026-11-09T15:11:56.298000+03:00 | /api/user-selection | 400 | 4.8 |
| 2026-11-09T15:11:56.423000+03:00 | /api/time-entry-permissions | 304 | 77.3 |
| 2026-11-09T15:12:27.087000+03:00 | /api/user-selection | 200 | 93.0 |
| 2026-11-09T15:12:27.090000+03:00 | /api/notifications | 304 | 125.3 |
| 2026-11-09T15:12:27.093000+03:00 | /api/time-entry-permissions | 304 | 142.2 |
| 2026-11-09T15:12:57.085000+03:00 | /api/user-selection | 304 | 148.3 |
| 2026-11-09T15:12:57.088000+03:00 | /api/time-entry-permissions | 304 | 168.2 |
| 2026-11-09T15:13:27.089000+03:00 | /api/notifications | 304 | 186.9 |
| 2026-11-09T15:13:46.093000+03:00 | /api/user-selection | 304 | 399.0 |
| 2026-11-09T15:13:46.097000+03:00 | /api/time-entry-permissions | 304 | 447.8 |
| 2026-11-09T15:14:46.097000+03:00 | /api/user-selection | 304 | 93.2 |
| 2026-11-09T15:14:46.107000+03:00 | /api/time-entry-permissions | 304 | 153.0 |
| 2026-11-09T15:14:46.109000+03:00 | /api/notifications | 304 | 124.4 |
| 2026-11-09T15:15:46.088000+03:00 | /api/user-selection | 304 | 116.5 |
| 2026-11-09T15:15:46.095000+03:00 | /api/time-entry-permissions | 304 | 148.2 |
| 2026-11-09T15:15:46.103000+03:00 | /api/notifications | 304 | 180.2 |
| 2026-11-09T15:16:46.134000+03:00 | /api/user-selection | 400 | 76.0 |
| 2026-11-09T15:16:46.205000+03:00 | /api/time-entry-permissions | 304 | 105.3 |
| 2026-11-09T15:16:46.232000+03:00 | /api/notifications | 304 | 85.5 |
| 2026-11-09T15:17:46.104000+03:00 | /api/user-selection | 200 | 148.9 |
| 2026-11-09T15:17:46.111000+03:00 | /api/time-entry-permissions | 304 | 157.9 |
| 2026-11-09T15:17:46.125000+03:00 | /api/notifications | 304 | 156.3 |
| 2026-11-09T15:18:46.092000+03:00 | /api/user-selection | 304 | 150.8 |
| 2026-11-09T15:18:46.104000+03:00 | /api/time-entry-permissions | 304 | 193.4 |
| 2026-11-09T15:18:46.114000+03:00 | /api/notifications | 304 | 158.4 |
| 2026-11-09T15:19:46.095000+03:00 | /api/user-selection | 400 | 12.3 |
| 2026-11-09T15:19:46.105000+03:00 | /api/time-entry-permissions | 304 | 525.2 |
| 2026-11-09T15:19:46.111000+03:00 | /api/notifications | 304 | 550.2 |
| 2026-11-09T15:20:46.099000+03:00 | /api/user-selection | 200 | 142.8 |
| 2026-11-09T15:20:46.108000+03:00 | /api/time-entry-permissions | 304 | 180.4 |
| 2026-11-09T15:20:46.112000+03:00 | /api/notifications | 304 | 157.7 |
| 2026-11-09T15:21:46.103000+03:00 | /api/user-selection | 304 | 98.8 |
| 2026-11-09T15:21:46.112000+03:00 | /api/time-entry-permissions | 304 | 138.0 |
| 2026-11-09T15:21:46.143000+03:00 | /api/notifications | 304 | 99.4 |
| 2026-11-09T15:22:46.097000+03:00 | /api/user-selection | 400 | 19.1 |
| 2026-11-09T15:22:46.105000+03:00 | /api/time-entry-permissions | 304 | 121.4 |
| 2026-11-09T15:22:46.122000+03:00 | /api/notifications | 304 | 133.4 |
| 2026-11-09T15:23:46.101000+03:00 | /api/user-selection | 200 | 161.8 |
| 2026-11-09T15:23:46.116000+03:00 | /api/time-entry-permissions | 304 | 171.7 |
| 2026-11-09T15:23:46.144000+03:00 | /api/notifications | 304 | 142.7 |
| 2026-11-09T15:24:46.099000+03:00 | /api/user-selection | 304 | 89.0 |
| 2026-11-09T15:24:46.110000+03:00 | /api/time-entry-permissions | 304 | 126.3 |
| 2026-11-09T15:24:46.125000+03:00 | /api/notifications | 304 | 94.6 |
| 2026-11-09T15:25:46.093000+03:00 | /api/user-selection | 400 | 12.8 |
| 2026-11-09T15:25:46.103000+03:00 | /api/time-entry-permissions | 304 | 124.4 |
| 2026-11-09T15:25:46.108000+03:00 | /api/notifications | 304 | 122.8 |
| 2026-11-09T15:25:56.297000+03:00 | /api/user-selection | 200 | 518.9 |
| 2026-11-09T15:25:56.425000+03:00 | /api/time-entry-permissions | 304 | 458.2 |
| 2026-11-09T15:26:26.307000+03:00 | /api/user-selection | 304 | 368.4 |
| 2026-11-09T15:26:26.309000+03:00 | /api/notifications | 304 | 413.5 |
| 2026-11-09T15:26:26.431000+03:00 | /api/time-entry-permissions | 304 | 318.6 |
| 2026-11-09T15:26:56.296000+03:00 | /api/user-selection | 304 | 312.7 |
| 2026-11-09T15:26:56.428000+03:00 | /api/time-entry-permissions | 304 | 131.8 |
| 2026-11-09T15:27:27.095000+03:00 | /api/user-selection | 304 | 272.9 |
| 2026-11-09T15:27:27.099000+03:00 | /api/notifications | 304 | 344.1 |
| 2026-11-09T15:27:27.102000+03:00 | /api/time-entry-permissions | 304 | 410.4 |
| 2026-11-09T15:27:57.099000+03:00 | /api/user-selection | 400 | 7.5 |
| 2026-11-09T15:27:57.103000+03:00 | /api/time-entry-permissions | 400 | 6.3 |
| 2026-11-09T15:28:26.296000+03:00 | /api/user-selection | 200 | 367.1 |
| 2026-11-09T15:28:26.299000+03:00 | /api/notifications | 304 | 371.3 |
| 2026-11-09T15:28:26.417000+03:00 | /api/time-entry-permissions | 200 | 100.6 |
| 2026-11-09T15:28:56.306000+03:00 | /api/user-selection | 304 | 101.5 |
| 2026-11-09T15:28:56.419000+03:00 | /api/time-entry-permissions | 304 | 60.5 |
| 2026-11-09T15:29:26.303000+03:00 | /api/user-selection | 304 | 75.7 |
| 2026-11-09T15:29:26.306000+03:00 | /api/notifications | 304 | 100.2 |
| 2026-11-09T15:29:26.417000+03:00 | /api/time-entry-permissions | 304 | 55.9 |
| 2026-11-09T15:29:56.301000+03:00 | /api/user-selection | 400 | 7.6 |
| 2026-11-09T15:29:56.419000+03:00 | /api/time-entry-permissions | 304 | 117.9 |
| 2026-11-09T15:30:26.298000+03:00 | /api/user-selection | 200 | 212.8 |
| 2026-11-09T15:30:26.301000+03:00 | /api/notifications | 304 | 228.7 |
| 2026-11-09T15:30:26.428000+03:00 | /api/time-entry-permissions | 304 | 157.5 |

## Acceptance still required

Observe a browser on the affected work network for at least 45 minutes after deployment. Compare failed response X-Request-ID with backend and proxy timestamps. This change improves recovery and diagnostics; it does not close the unexplained transport 400.