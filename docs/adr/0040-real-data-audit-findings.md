# 0040 - Real-Data Audit Findings and Substance Metrics

## Status

Accepted

## Context

Phase 1 works for the happy path but does not understand messy podcast recordings. The Phase 2 audit defines 10 real-world media profiles spanning clean, messy, broken, adversarial, huge, silent, stereo, music, and already-mastered inputs.

## Decision

Use `docs/phase2-substance/realdata-audit.md` and `test/fixtures/realdata/` as the grading rubric. The backend inference engine must satisfy each fixture's expected properties and report pass-rate changes in the Phase 2 postmortem.

Success means at least 7 of 10 fixtures produce a usable processing plan without manual changes, 10 of 10 do not crash, and every blocked/error case gives a domain-specific next step.

## Consequences

- Fixture expectations become release-blocking tests.
- The app can improve without widening the product surface.
- Large copyrighted audio is represented by compact real-world media profiles to keep the repository usable.

## Alternatives Considered

- Commit large real recordings: rejected due size, licensing, and contributor friction.
- Use synthetic happy-path samples only: rejected because it would preserve the Phase 1 toy behavior.
