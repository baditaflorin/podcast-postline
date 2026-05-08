# 0044 - Confidence Model

## Status

Accepted

## Context

No silent wrongness is allowed. When the app is uncertain, users need to know.

## Decision

Every inference has confidence:

- `high`: 0.85-1.0
- `medium`: 0.6-0.84
- `low`: below 0.6

The plan exposes an overall confidence plus per-warning confidence. Confidence is reduced by unknown facts, mixed music/speech, legacy formats, and very long recordings. Blocked silent/truncated/too-large decisions can still be high confidence.

## Consequences

- The UI can separate "ready" from "needs review."
- Exports and provenance include confidence.

## Alternatives Considered

- Binary pass/fail: rejected because many podcast inputs are usable but risky.

