# 0043 - Domain Vocabulary and UI Language

## Status

Accepted

## Context

Phase 1 used generic errors and settings labels. Phase 2 should talk like a podcast post-production tool.

## Decision

Use domain words in user-facing messages:

- "recording", "episode", "speech", "music intro", "room tone", "clipping", "silence", "broadcast loudness"
- avoid raw implementation terms such as "selector", "struct", "undefined", "pipeline failure"

Errors follow what/why/now-what. Inference reasons are short and specific.

## Consequences

- The UI becomes more trustworthy without extra polish.
- API errors can be shown directly by the frontend.

## Alternatives Considered

- Generic technical errors: rejected as unactionable.
