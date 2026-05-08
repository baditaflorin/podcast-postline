# Postmortem

Date: 2026-05-08

Release: `v0.1.0`

Repository: https://github.com/baditaflorin/podcast-postline

Live site: https://baditaflorin.github.io/podcast-postline/

## What Was Built

- GitHub Pages frontend in `docs/` with upload UI, processing settings, GitHub star link, PayPal link, version, and commit display.
- Go API backend with health, readiness, version, metrics, and multipart audio processing endpoints.
- Audio pipeline wrapper around FFmpeg, RNNoise, `pyloudnorm`, SoX, and FFmpeg export.
- Dockerfile, Compose, nginx, Prometheus sample config, local hooks, Makefile, tests, smoke checks, ADRs, and operational docs.

## Was Mode C Correct?

Yes. In hindsight Mode C is still the right v1 choice. Mode A would have forced FFmpeg/RNNoise/Python into heavy WASM and browser memory constraints. Mode B does not fit because user uploads are private runtime data. The static frontend plus Docker backend split is the smallest practical architecture for the requested native audio stack.

## What Worked

- GitHub Pages from `main` `/docs` worked from the first scaffold commit.
- The frontend bundle stayed below the 200 KB gzip budget for initial JS.
- Stub processor mode made local tests and smoke checks fast without native audio dependencies.
- `govulncheck`, `npm audit`, lint, unit tests, build, and smoke pass locally.

## What Did Not Work

- Plain `go test ./...` wandered into a Go package inside `node_modules`, so Make targets now scope Go commands to `./cmd/... ./internal/...`.
- The local Go 1.26.2 toolchain triggered standard-library vulnerability findings, so the module now targets Go 1.26.3.
- A self-referential "show the latest commit inside the committed static bundle" is not perfectly representable; the page shows the source commit used for the Pages build.

## What Surprised Us

- `golangci-lint` v2 required an explicit config version.
- The static app plus React/TanStack/Zod still fit comfortably under the JS budget.

## Accepted Tech Debt

- v1 uses a synchronous `/api/process` request; long episodes would benefit from queued jobs and polling.
- The real Docker image should be exercised on a Linux amd64 host with a real sample episode before production use.
- The frontend has lifecycle progress, not per-stage streaming progress.

## Next Improvements

1. Add queued background jobs with resumable downloads and per-stage progress.
2. Add a Docker integration test with a short fixture audio file and real RNNoise pipeline execution.
3. Add optional client-side waveform preview and before/after loudness report.

## Time Spent vs Estimate

Estimated: 4-6 hours for a production-grade scaffold and v1 happy path.

Actual: about 2 hours for implementation, docs, local checks, Pages publishing, and smoke verification in this environment.

