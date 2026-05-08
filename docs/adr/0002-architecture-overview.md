# 0002 - Architecture Overview and Module Boundaries

## Status

Accepted

## Context

The project has a static user interface and a native processing backend. Clear boundaries keep Pages deployment independent from backend operations.

## Decision

Use these boundaries:

- `frontend/`: Vite React TypeScript application.
- `docs/`: GitHub Pages publish directory and project docs.
- `cmd/server/`: Go API entry point.
- `internal/httpapi/`: routes, handlers, middleware.
- `internal/audio/`: processing interface and command-backed implementation.
- `backend/scripts/`: Python audio pipeline scripts.
- `deploy/`: Docker Compose, nginx, and production server documentation.

## Consequences

- The frontend never imports backend code.
- The backend does not serve the frontend.
- Documentation and Pages output live together under `docs/`, so build scripts must preserve ADRs.

## Alternatives Considered

- Single Node app: rejected because the native pipeline and operational requirements are better isolated in Docker.
- Backend serving static assets: rejected because GitHub Pages is a first-class deliverable.
