# 0008 - Go Backend Project Layout

## Status

Accepted

## Context

The backend needs a maintainable API layout and room for future CLI/data tools.

## Decision

Follow the common Go project layout:

- `cmd/server/` for the API binary.
- `internal/` for private application packages.
- `pkg/` reserved for future public libraries.
- `api/` for OpenAPI.
- `configs/` for sample configuration.
- `scripts/` and `backend/scripts/` for operational and audio scripts.
- `test/` for integration and smoke helpers.

## Consequences

- Internal packages are not importable by downstream modules.
- The layout is familiar to Go contributors.

## Alternatives Considered

- Flat package layout: rejected because the project spans HTTP, processing, config, and observability.
