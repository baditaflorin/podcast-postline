# 0060 - Completeness Audit Findings and Phase 3 Success Metrics

## Status

Accepted

## Context

Phase 2 made podcast-postline smarter about preflight and inference, but Phase 3 asks whether a stranger can use the app end-to-end with their own recordings. The audit found partial input coverage, download-only output, no state round-trip, and weak frontend boundary validation.

## Decision

Phase 3 completeness is measured against the audit grids in `docs/phase3/`. Success means every input/output row is either green or permanently out of scope by ADR, every visible control has a real behavior, workspace state can round-trip, and tests cover the primary real-user paths.

The measurable targets are:

- Input audit green or ADR-out-of-scope rows: 100%.
- Output audit green or ADR-out-of-scope rows: 100%.
- Core DRY violations remaining: 0.
- Production TODO/FIXME/XXX/HACK markers: 0.
- Frontend API boundary direct casts: 0.
- Real-user e2e paths: at least 4.
- Workspace export/import deterministic round-trip: 100% in unit tests.

## Consequences

The work prioritizes completing existing promises over adding new audio features. Some rows will become explicitly out of scope instead of being hidden as silent gaps.

## Alternatives Considered

- Treat Phase 3 as a UI polish pass. Rejected because the audits found workflow gaps, not aesthetic gaps.
- Add more DSP options. Rejected because Phase 2 substance is locked.
