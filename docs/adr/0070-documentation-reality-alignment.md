# 0070 - Documentation-Reality Alignment Process

## Status

Accepted

## Context

The README and ADRs contain claims that were true in spirit but incomplete in user workflow terms.

## Decision

Documentation claims must either map to a tested behavior or be softened into a limitation. README will include:

- Live site and repo links.
- A verified features checklist.
- Quickstart commands.
- Current limitations, including GHCR package scope and URL ingestion.

Phase postmortems record any remaining gaps honestly.

## Consequences

The public repo stops overpromising. Missing features users do not see are less important than visible claims that are wrong.

## Alternatives Considered

- Leave docs aspirational. Rejected because Phase 3’s purpose is trust.
- Document only architecture. Rejected because strangers need workflow truth.
