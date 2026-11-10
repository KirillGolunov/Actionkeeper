# Caddy 2.11.9 investigation

Initial run: https://github.com/KirillGolunov/Actionkeeper/actions/runs/42807484147
Image digest: sha256:0c2243efcf437ab7f7a978f1027fcf0d4f9be8a75df27b1b3fbc5dbe0ffa8cf0
Binary: v2.11.9 h1:bhZtcRKQOq0fuLvEgCdPYvUxXyGn9kzjG4lh2332DTE=

## Observed

16 valid conditional HTTP/1.1 GET requests over reused connections returned 304, including 0, 1, 5 and 30 second idle intervals. Both deliberately invalid request lines and NUL-containing header values produced the exact incident response:

```
HTTP/1.1 400 Bad Request
Content-Type: text/plain; charset=utf-8
Connection: close

400 Bad Request
```

## Limits

The lab reproduces the generic parser response, NOT the production incident trigger. It uses cleartext HTTP and static responses, not the production TLS/reverse-proxy chain. No conclusion about a production Caddy defect or network modification follows from this test. Do not disable cache, keep-alive, or parser validation based on this result.

HAR cannot establish the bytes received by the parser. Its `connection` field is the port (443), not a reusable connection identifier. All four failed entries have distinct `_connectionId` values with no preceding entries under those values in the supplied capture. This does not prove those connections were new.

## Required next evidence

Capture Chrome NetLog in its default privacy mode on the affected computer through one recurrence. Examine proxy configuration, socket reuse, TLS peer/certificate and HTTP stream events; redact before sharing. If this cannot distinguish the rejecting hop, a controlled instrumented TLS endpoint must record parser error categories and structural metadata without credentials or raw request bytes. That requires a separately reviewed implementation, not a production parser bypass.

Production source remains unconfirmed. No production changes made by this investigation.
