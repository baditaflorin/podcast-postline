# 0069 - Type Safety Policy at Boundaries

## Status

Accepted

## Context

The frontend casts API JSON and provenance headers directly to domain types. This violates the Phase 3 no-silent-wrongness bar.

## Decision

All external JSON boundaries use zod schemas:

- `/api/preflight` response.
- Domain error response.
- Provenance header payload.
- Workspace import/autosave/hash state.

Type assertions are limited to platform integration points where the DOM API requires them, and they must be narrowed immediately.

## Consequences

Malformed backend or imported state produces actionable errors instead of corrupted UI state. Tests can assert schema behavior.

## Alternatives Considered

- Trust the backend because it is ours. Rejected because deployments and stale clients can drift.
- Generate the OpenAPI client now. Rejected as larger than needed for Phase 3, but still valid future work.
