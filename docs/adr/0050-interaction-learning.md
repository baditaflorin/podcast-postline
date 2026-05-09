# 0050 - Interaction Learning Policy

## Status

Accepted

## Context

The app can feel smarter if it remembers corrections, but it must not surprise users.

## Decision

Remember only transparent session/local preferences: target LUFS, format, trim, denoise, preserve stereo, and API URL. If the user overrides an inferred option, the current session respects that correction for similar files.

No hidden personalization, accounts, server-side learning, or cross-device learning in v2.

## Consequences

- Users do less repeated correction.
- Behavior remains inspectable and local.

## Alternatives Considered

- Server-side learning: rejected as out of scope and privacy-sensitive.
