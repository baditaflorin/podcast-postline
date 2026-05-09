# 0045 - State Taxonomy and State Machine

## Status

Accepted

## Context

Phase 1 could leave the user guessing during long processing and errors.

## Decision

Use explicit frontend states documented in `docs/phase2-substance/states.md`: `idle`, `selected`, `preflighting`, `ready`, `needs-review`, `blocked`, `processing`, `processed`, `error-recoverable`, and `error-fatal`.

Every state has an exit. Processing and preflight requests are cancellable with `AbortController`. Concurrent runs cancel the previous run before starting a new one.

## Consequences

- No stuck UI state is intentional.
- State logic becomes testable and easier to reason about.

## Alternatives Considered

- Reuse only TanStack mutation flags: rejected because domain states are richer than network flags.
