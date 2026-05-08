# 0009 - Configuration and Secrets Management

## Status

Accepted

## Context

The frontend must never hold secrets. The backend needs runtime configuration for ports, CORS, upload limits, and processing paths.

## Decision

Use environment variables documented in `.env.example`. The frontend reads only public build-time values. The backend reads runtime environment variables through a small config package.

No `.env` files, keys, tokens, or certificates are committed.

## Consequences

- Deployments are repeatable through Docker Compose environment files.
- The same frontend can point at staging or production API URLs.
- Secret scanning is enforced by local hooks.

## Alternatives Considered

- Committed config files with real values: rejected because secrets must stay out of git.
- Runtime frontend secrets: rejected categorically.

