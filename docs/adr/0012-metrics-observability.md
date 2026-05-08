# 0012 - Metrics and Observability

## Status

Accepted

## Context

Mode C requires scrape-ready metrics without making Prometheus a hard dependency.

## Decision

Expose `/metrics` with Prometheus Go runtime metrics plus:

- HTTP request duration histogram.
- HTTP request count by route, method, and status.
- Audio processing duration histogram.
- Audio processing success and failure counters.

nginx blocks public access to `/metrics`. Prometheus is profile-gated in Compose.

## Consequences

- The backend keeps serving if Prometheus is down.
- Operators can enable metrics without changing the app image.

## Alternatives Considered

- No metrics: rejected because processing duration and failures are core operational signals.
- Hosted analytics: rejected for backend observability.

