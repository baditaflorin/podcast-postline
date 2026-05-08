# 0046 - Performance Budgets

## Status

Accepted

## Context

Phase 2 needs performance honesty for real audio.

## Decision

Budgets:

- fixture-profile inference: <50 ms in unit tests
- frontend shows preflight/processing state within 300 ms
- processing request is cancellable at all times after start
- files over configured upload limit are blocked before processing

The real native pipeline remains synchronous in v2, but the UI and API surface report progress phases and cancellation.

## Consequences

- Long jobs are honest even before a full queue system exists.
- Performance checks are included in fixture tests.

## Alternatives Considered

- Full async job queue: valuable but treated as Phase 3 because it widens architecture/operations.

