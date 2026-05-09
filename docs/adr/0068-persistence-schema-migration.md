# 0068 - Persistence Schema and Migration Policy

## Status

Accepted

## Context

Preferences already use `podcast-postline.preferences.v1`. Phase 3 needs workspace persistence that can survive future shape changes.

## Decision

Add `podcast-postline.workspace.v1` with schema `phase3.workspace.v1`. The persisted state includes:

- Preferences.
- Job metadata without raw file bytes.
- Selected job id.
- Processing plan.
- Provenance.
- Session overrides.
- Activity entries.

Unknown or invalid persisted data is ignored with a recoverable message. Future breaking changes add a migration path or a clear export/restart message.

## Consequences

Workspace export/import can be tested independently. Old missing workspace data behaves like a new session.

## Alternatives Considered

- Reuse preferences storage for everything. Rejected because preferences and workspace have different lifetimes.
- Silently mutate unknown old state. Rejected because it risks wrong restoration.
