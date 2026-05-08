# 0004 - API Contract

## Status

Accepted

## Context

Mode C requires a runtime API contract. The frontend needs to upload one file, receive one processed export, and inspect backend health/version.

## Decision

Expose REST/JSON plus binary download endpoints:

- `GET /healthz`: liveness.
- `GET /readyz`: readiness.
- `GET /metrics`: Prometheus metrics, blocked publicly by nginx.
- `GET /api/version`: JSON with version, commit, and build date.
- `POST /api/process`: multipart upload with `file`, `target_lufs`, `format`, and `trim_silence`. Returns the exported audio as `application/octet-stream` with a download filename.

The OpenAPI contract is stored at `api/openapi.yaml`.

## Consequences

- The frontend can be deployed separately from the backend.
- The API base URL is configurable at build time with `VITE_API_BASE_URL`.
- Large uploads require nginx and backend body-size limits.

## Alternatives Considered

- Job queue with polling: deferred until files are large enough to require background processing.
- WebSocket progress: deferred for v1; the current UI reports request lifecycle state.
