# 0001 - Deployment Mode

## Status

Accepted

## Context

`podcast-postline` processes private user audio with SoX, RNNoise, Python `pyloudnorm`, and FFmpeg. The frontend should stay public, cacheable, and easy to host on GitHub Pages, but the audio toolchain is native, CPU-heavy, and not a good fit for a first-load browser payload.

## Decision

Use Mode C: GitHub Pages frontend plus Docker backend.

The frontend is a static Vite app served from `main` branch `/docs`. The backend is an API-only Docker service that accepts uploaded recordings, runs the audio pipeline, and returns the processed export.

## Consequences

- The public surface remains static except for the configured API URL.
- Private recordings are sent only to the user-selected backend.
- The backend needs Docker, storage for temporary files, and operational docs.
- The frontend can show repository, PayPal, version, and commit information without holding secrets.

## Alternatives Considered

- Mode A: pure GitHub Pages. Rejected for v1 because FFmpeg, RNNoise, SoX, and Python loudness analysis would require large WASM/Pyodide assets, complex cross-origin isolation workarounds, and high browser memory usage for long episodes.
- Mode B: GitHub Pages plus pre-built data. Rejected because each user uploads private audio and needs runtime processing, not shared static artifacts.
