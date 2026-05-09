# 0047 - Error Taxonomy and Messaging

## Status

Accepted

## Context

Generic backend errors hide what the user should do next.

## Decision

Use structured domain errors:

- `what`: what failed
- `why`: domain explanation
- `next`: recommended action
- `recoverable`: whether the user's current work can continue
- `code`: stable machine-readable identifier

API JSON errors use this shape, and frontend messages render it directly.

## Consequences

- Truncated, silent, unsupported, huge, invalid-option, and processing failures are distinguishable.
- Errors can be tested without string-matching stack traces.

## Alternatives Considered

- Keep `{"error":"..."}` only: rejected as insufficient for Phase 2.
