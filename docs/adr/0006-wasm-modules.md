# 0006 - WASM Modules

## Status

Accepted

## Context

The project considered browser-side FFmpeg/RNNoise processing to stay fully static.

## Decision

Do not ship WASM modules in v1. Native audio processing runs in the Docker backend.

## Consequences

- Initial frontend payload stays small.
- GitHub Pages does not need COOP/COEP header workarounds.
- The backend is required for real processing.

## Alternatives Considered

- ffmpeg.wasm plus Pyodide/pyloudnorm: rejected for long-form podcast memory and payload concerns.
- RNNoise WASM only: rejected because the full requested pipeline still needs native FFmpeg and loudness analysis.
