# 0049 - Inspectability and Debug Surface

## Status

Accepted

## Context

Power users and support need to see what the app inferred.

## Decision

Use `?debug=1` to reveal a debug panel with preflight JSON, provenance, warnings, and request state. The panel is read-only and does not collect analytics.

## Consequences

- Debugging user reports becomes easier.
- Internal state remains invisible by default.

## Alternatives Considered

- Always show raw JSON: rejected because it distracts normal users.

