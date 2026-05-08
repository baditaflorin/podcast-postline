# 0013 - Testing Strategy

## Status

Accepted

## Context

The project has frontend logic, Go API behavior, and a native pipeline that may not be available on every developer machine.

## Decision

Use:

- Go unit tests colocated with packages.
- Vitest unit tests for frontend logic.
- Playwright happy-path smoke for the built Pages app.
- `PROCESSOR_MODE=stub` for fast backend API smoke tests.
- Docker/manual integration tests for the real audio toolchain.

## Consequences

- `make test` stays fast.
- The real RNNoise/FFmpeg pipeline remains testable in Docker without forcing local native installs.

## Alternatives Considered

- Always running real audio processing in pre-push: rejected because it would be slow and machine-dependent.

