# Architecture

Live site: https://baditaflorin.github.io/podcast-postline/

Repository: https://github.com/baditaflorin/podcast-postline

## Context

```mermaid
C4Context
title podcast-postline context
Person(creator, "Podcast creator")
System_Boundary(pages, "GitHub Pages static boundary") {
  System(ui, "React frontend", "Upload flow, settings, API client, download")
}
System_Boundary(runtime, "Docker backend boundary") {
  System(api, "Go API", "Validation, uploads, metrics, CORS")
  System(audio, "Native audio pipeline", "SoX, RNNoise, pyloudnorm, FFmpeg")
}
Rel(creator, ui, "Uses", "HTTPS")
Rel(ui, api, "Uploads audio", "POST /api/process")
Rel(api, audio, "Executes", "local process")
```

## Containers

```mermaid
C4Container
title podcast-postline containers
Person(creator, "Podcast creator")
Container_Boundary(pages, "GitHub Pages") {
  Container(frontend, "Vite React app", "TypeScript", "Static UI in docs/")
}
Container_Boundary(server, "Operator server") {
  Container(nginx, "nginx", "TLS, CORS, rate limits, port 25342")
  Container(goapi, "postline-server", "Go", "API-only backend")
  Container(processor, "Audio tools", "C/Python", "SoX + RNNoise + pyloudnorm + FFmpeg")
  Container(prom, "Prometheus", "Optional", "Metrics scrape")
}
Rel(creator, frontend, "Uses", "HTTPS")
Rel(frontend, nginx, "Calls API", "HTTPS")
Rel(nginx, goapi, "Proxies", "HTTP :8080")
Rel(goapi, processor, "Runs commands", "local filesystem")
Rel(prom, goapi, "Scrapes /metrics", "HTTP")
```

## Module Boundaries

- `frontend/`: static app source.
- `docs/`: GitHub Pages output and documentation.
- `cmd/server/`: Go server entry point.
- `internal/httpapi/`: routes and HTTP concerns.
- `internal/audio/`: processing abstraction and implementations.
- `backend/scripts/`: Python audio pipeline.
- `deploy/`: Docker Compose, nginx, Prometheus, and server docs.
