# 0017 - Dependency Policy

## Status

Accepted

## Context

The project must avoid custom implementations where production libraries exist.

## Decision

Use established dependencies:

- Backend: chi, go-chi/cors, validator, Prometheus client, testify.
- Frontend: React, Vite, Tailwind CSS, Zod, TanStack Query, lucide-react, Vitest, Playwright.
- Audio runtime: SoX, RNNoise, pyloudnorm, FFmpeg.

Pin dependencies through `go.mod`, `package-lock.json`, and Docker image tags. Run `go mod tidy`, `govulncheck`, and `npm audit` before release.

## Consequences

- The codebase stays smaller and more predictable.
- Dependency updates need periodic maintenance.

## Alternatives Considered

- Hand-written router, upload parsing, metrics, or audio DSP: rejected.

