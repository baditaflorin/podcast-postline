# 0015 - Deployment Topology

## Status

Accepted

## Context

Mode C separates static hosting from runtime processing.

## Decision

Deploy as:

- GitHub Pages: frontend from `https://baditaflorin.github.io/podcast-postline/`.
- Docker backend: API-only container on an operator-controlled server.
- nginx: TLS termination, CORS, upload size, rate limiting, and `/metrics` blocking.
- Host public port: `25342`.

## Consequences

- The backend can scale or move independently.
- CORS must explicitly allow the Pages origin.
- Server setup is documented under `deploy/`.

## Alternatives Considered

- Pages-only deployment: rejected in ADR 0001.
- Backend serving frontend: rejected in ADR 0002.
