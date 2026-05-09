# 0064 - DRY Consolidation Map

## Status

Accepted

## Context

The audit found duplicated multipart staging in backend handlers, duplicated form parsing shape, and no canonical workspace schema.

## Decision

Phase 3 consolidates:

- Multipart upload parsing/staging into one backend helper used by preflight and process.
- Boolean/numeric form parsing into focused backend helpers.
- Frontend workspace export/import/share state into one schema module.
- Frontend API response validation into zod schemas colocated with domain types.

## Consequences

Upload validation changes happen in one place. Workspace import/export/deep-link state uses the same versioned contract.

## Alternatives Considered

- Leave small duplication alone. Rejected for upload staging because it touches security and error behavior.
- Introduce a large application framework. Rejected as unnecessary for this scale.
