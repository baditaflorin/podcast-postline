# 0041 - Input Robustness and Normalization Policy

## Status

Accepted

## Context

Podcast uploads arrive as WAV, MP3, M4A, FLAC, corrupt partial transfers, legacy recordings, near-silent files, and oversized board captures.

## Decision

Run media preflight before processing. Normalize facts into a stable profile:

- format, MIME, size, SHA-256 fingerprint
- duration, channels, sample rate, bit depth where known
- loudness, peak, silence, speech/music ratios where known
- decode state: `ok`, `partial`, `truncated`, `unsupported`, or `unknown`

Boundary validation rejects empty, too-large, truncated, or silent files before the destructive pipeline starts.

## Consequences

- Users get feedback before waiting on the full pipeline.
- The production Docker backend can use native probes while tests use deterministic profile fixtures.
- Unknown facts do not become false certainty; they lower confidence.

## Alternatives Considered

- Let FFmpeg fail inside processing: rejected because errors are late and generic.
- Require users to configure file properties manually: rejected because Phase 2 substance means the app infers obvious facts.
