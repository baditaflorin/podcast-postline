# podcast-postline

![Live GitHub Pages](https://img.shields.io/badge/live-GitHub%20Pages-006d77)
![Mode C](https://img.shields.io/badge/deployment-Mode%20C-f28c28)
![License MIT](https://img.shields.io/badge/license-MIT-1c2420)

Live site: https://baditaflorin.github.io/podcast-postline/

Repository: https://github.com/baditaflorin/podcast-postline

Support: https://www.paypal.com/paypalme/florinbadita

`podcast-postline` is a self-hosted podcast post-production line: upload a raw recording, denoise with RNNoise, normalize to `-16 LUFS` with `pyloudnorm`, trim silence with SoX, and export with FFmpeg.

![podcast-postline UI](https://raw.githubusercontent.com/baditaflorin/podcast-postline/main/docs/demo.svg)

## Verified Features

- Multi-file picker and drag/drop queue for WAV, MP3, M4A, and FLAC recordings.
- Generated sample WAV for first-run testing.
- Preflight plan with confidence, warnings, blockers, and recommended settings.
- RNNoise denoise, pyloudnorm loudness normalization, SoX silence trim, and FFmpeg export in real backend mode.
- Processed audio download plus provenance JSON copy/download.
- Versioned `.postline.json` workspace export/import and small workspace share links.
- curl and Python snippets generated from the current settings.
- Fresh-start reset, autosaved workspace metadata, and persisted settings.

## Quickstart

```sh
npm install
make install-hooks
make build
PROCESSOR_MODE=stub go run ./cmd/server
npm run dev
```

## Production Backend

```sh
docker compose -f deploy/docker-compose.yml pull
docker compose -f deploy/docker-compose.yml up -d
```

The backend image is published as `ghcr.io/baditaflorin/podcast-postline:latest` after `make docker-push`.

GHCR publishing requires a GitHub token with package write scope. If `make docker-push` fails with `permission_denied`, refresh the token with `write:packages` and retry.

## Limitations

- Browser URL import is intentionally not built because many podcast hosts and private cloud drives block cross-origin audio fetches. Download the recording first or use the API snippet from a server.
- Workspace files and share links store settings, queue metadata, plans, and provenance, not raw audio bytes. Reattach local audio files after importing state.
- The public GitHub Pages frontend needs a reachable backend API to process real audio. Local development can use `PROCESSOR_MODE=stub` for smoke testing.
- Folder upload, CSV export, screenshot export, and embed code are out of scope for v0.3.0.

## Architecture

```mermaid
C4Context
title podcast-postline context
Person(creator, "Podcast creator")
System_Boundary(pages, "GitHub Pages") {
  System(ui, "Static React UI", "Upload flow, settings, download")
}
System_Boundary(server, "Docker server") {
  System(api, "Go API", "Uploads, validation, metrics")
  System(pipeline, "Audio pipeline", "SoX + RNNoise + pyloudnorm + FFmpeg")
}
Rel(creator, ui, "Uses", "HTTPS")
Rel(ui, api, "POST /api/process", "HTTPS")
Rel(api, pipeline, "Runs native tools", "local process")
```

Architecture docs: https://github.com/baditaflorin/podcast-postline/blob/main/docs/architecture.md

ADRs: https://github.com/baditaflorin/podcast-postline/tree/main/docs/adr

API docs: https://github.com/baditaflorin/podcast-postline/blob/main/docs/api.md

Deploy guide: https://github.com/baditaflorin/podcast-postline/blob/main/deploy/README.md

## Local Checks

```sh
make fmt
make lint
make test
make smoke
```

`make build` writes the GitHub Pages app into `docs/` and builds the Go server into `bin/postline-server`.
