# 0067 - State Management Convention

## Status

Accepted

## Context

The app currently uses React local state and localStorage preferences. Phase 3 adds queue metadata, workspace import/export, share state, and autosave.

## Decision

Use React local state for active UI state and a versioned workspace snapshot for persistence. Keep raw `File` objects in memory only. Persist metadata, preferences, selected job id, plan/provenance, activity, and session overrides.

The workspace snapshot is the canonical state format for autosave, download, import, and hash sharing.

## Consequences

Reload can restore meaningful context without promising impossible restoration of large local files. Import/export and share links are deterministic.

## Alternatives Considered

- Persist raw audio blobs in IndexedDB. Rejected for v0.3 because storage quotas and file sizes vary widely.
- Add Redux or another state library. Rejected because the state remains local to one page.
