# 0048 - Determinism and Reproducibility

## Status

Accepted

## Context

Substance requires identical input and options to produce identical decisions and reproducible output metadata.

## Decision

Inference outputs are deterministic: stable rule order, stable warning IDs, stable JSON ordering in tests, no timestamps. Processing responses include provenance headers with schema version, app version, commit, input fingerprint, options, plan ID, warnings, confidence, and a generated-at timestamp.

The timestamp is excluded from determinism tests and included only as runtime provenance.

## Consequences

- Fixture outputs can be compared reliably.
- Users and maintainers can reproduce decisions.

## Alternatives Considered

- Runtime-only logs: rejected because users need provenance with the export response.
