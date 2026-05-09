# 0063 - Half-Baked Feature Triage Decisions

## Status

Accepted

## Context

Phase 3 identified several partial features that should either be finished, hidden, or deleted.

## Decision

| Feature | Decision | Rationale |
| --- | --- | --- |
| Reset status | Finish | Users need an explicit fresh-start path and predictable active-job reset. |
| Session correction memory | Finish | It already affects recommendations; it should be visible in activity/export state. |
| Provenance display | Finish | It should become downloadable/copyable evidence, not just UI text. |
| Debug surface | Finish | It remains useful when it includes queue/workspace state. |
| GHCR publication claim | Finish docs | The make target exists; docs need the package-scope caveat. |
| URL input | Do not build | Browser CORS makes it unreliable; explain the limitation. |
| Folder input | Do not build | Not needed for v0.3 and browser support is non-standard. |

## Consequences

The visible UI has no production stubs. Deferred pathways are documented as out of scope instead of half-shipped.

## Alternatives Considered

- Hide all partial features. Rejected because provenance, reset, and session memory are valuable when finished.
- Build URL ingestion. Rejected for the reasons in ADR 0061.

