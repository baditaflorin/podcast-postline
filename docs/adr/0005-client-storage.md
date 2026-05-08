# 0005 - Client-Side Storage Strategy

## Status

Accepted

## Context

The frontend should remember non-sensitive user preferences without accounts.

## Decision

Use `localStorage` for small preferences: API base URL override, target LUFS, trim option, and preferred export format.

Do not store uploaded audio, processed audio, secrets, or API tokens in browser storage.

## Consequences

- Preferences survive reloads on one device.
- Private media stays in memory and explicit downloads only.
- No cross-device sync in v1.

## Alternatives Considered

- IndexedDB/OPFS: unnecessary for small preference data.
- Server persistence: rejected because accounts and sync are non-goals for v1.
