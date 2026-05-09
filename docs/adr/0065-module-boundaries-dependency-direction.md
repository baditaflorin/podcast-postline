# 0065 - Module Boundaries and Dependency Direction

## Status

Accepted

## Context

`frontend/src/App.tsx` held orchestration, rendering, input handling, output helpers, and persistence decisions. This made completeness changes risky.

## Decision

Frontend dependency direction is:

UI components -> feature helpers -> typed domain schemas -> platform APIs.

Phase 3 may extract helpers and focused components when the boundary is obvious:

- Input acquisition and file classification.
- Workspace import/export/share state.
- Snippet generation.
- Presentational summaries.

Backend dependency direction remains:

HTTP handlers -> audio interfaces/config/observability -> primitives.

## Consequences

The app remains small, but new completeness behavior no longer needs to live entirely in `App.tsx`.

## Alternatives Considered

- Rewrite the frontend around a router/state machine library. Rejected because it would be architecture churn.
- Leave the god component untouched. Rejected because Phase 3 adds input/output paths and would worsen the module.
