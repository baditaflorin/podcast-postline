# 0066 - Error Handling Convention

## Status

Accepted

## Context

Phase 2 established domain errors in the backend and actionable messages in the frontend. Phase 3 adds import, clipboard, sharing, and boundary validation paths that need the same tone.

## Decision

Errors must include:

- What failed.
- Why it failed in podcast/user terms.
- What the user can do next.

Backend HTTP errors continue to use `audio.DomainError` and JSON. Frontend import/export/clipboard errors use one-sentence actionable messages and never expose raw stack traces. Recoverable failures leave user state intact.

## Consequences

Boundary validation failures become visible, not silently coerced. Clipboard unsupported states are guidance, not crashes.

## Alternatives Considered

- Let thrown exceptions surface through React. Rejected because users need recovery steps.
- Add a global toast system now. Rejected as polish; inline status is enough for Phase 3.

