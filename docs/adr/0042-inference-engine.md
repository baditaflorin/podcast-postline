# 0042 - Inference Engine

## Status

Accepted

## Context

The app needs to choose safe defaults from media facts: denoise, normalize, trim, preserve stereo, block, or warn.

## Decision

Use a deterministic rule-based inference engine in Go. Live uploads are probed with `ffprobe` when available, then fall back to the local WAV parser for simple RIFF facts. Rules are intentionally explainable:

- silent or truncated input blocks processing
- files above upload/runtime budget block processing
- stereo speech preserves stereo and skips RNNoise by default
- mixed music/speech disables aggressive trim and denoise
- already-compliant loudness skips normalization
- high noise/quiet speech recommends denoise and warns about gain
- legacy sample rates, 8-bit audio, clipping, and DC offset surface warnings

Rules produce a `ProcessingPlan` with recommended options, warnings, anomalies, reasons, and confidence.

## Consequences

- Decisions are deterministic and testable.
- Users can see why the app made a recommendation.
- The model is transparent rather than ML-magical.
- Docker deployments get useful preflight facts for MP3, M4A, FLAC, and WAV because `ffprobe` is already part of the audio runtime.

## Alternatives Considered

- Machine-learning classifier: rejected for v2 because explainable deterministic behavior is higher value.
- Keep fixed defaults: rejected because it fails stereo, music, mastered, silent, and huge fixtures.
