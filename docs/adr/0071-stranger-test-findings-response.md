# 0071 - Stranger Test Findings and Response

## Status

Accepted

## Context

Phase 3 requires a cold run through the app as if by a stranger. No external tester is available in this autonomous pass, so the substitute is a private-browser style run with a fresh local profile and real fixture-derived inputs.

## Decision

The stranger test will exercise:

- Generated sample input.
- Multi-file upload/drop queue.
- Workspace export/import.
- Share link restore.
- API snippet copy path.
- Reset/fresh-start path.

The top three issues found must be fixed before the postmortem is accepted.

## Consequences

This is not as strong as another human tester, so the postmortem must say that plainly. The test still catches first-run dead ends and documentation drift.

## Alternatives Considered

- Skip because no external tester is present. Rejected; the prompt allows a self-run private-browser substitute.
- Wait for confirmation. Rejected by autonomous Phase 3 mode.

