# 0011 - Logging Strategy

## Status

Accepted

## Context

The backend needs operational logs; the frontend should avoid noisy production console output.

## Decision

Use Go `slog` JSON logs to stdout in the backend. Include request method, path, duration, status, and trace id when available.

The frontend logs nothing in production except unrecoverable error boundary reporting to the UI.

## Consequences

- Docker and nginx can collect backend logs without file mounts.
- Local development remains easy to inspect.

## Alternatives Considered

- Text logs: rejected because JSON logs are easier to ship and filter.
- Client analytics logs: rejected for v1 privacy.

