# Phase 2 Substance Postmortem

Date: 2026-05-09

Release: `v0.2.0`

## Real-Data Pass Rate

Before: 1/10 fixtures were safe on the happy path without the user guessing. Only the clean studio WAV was mostly fine.

After: 7/10 fixtures produce a usable processing plan with no manual setting changes. The remaining 3/10 are correctly blocked with actionable reasons instead of being processed blindly.

| Fixture                  | Before                      | After                                                  |
| ------------------------ | --------------------------- | ------------------------------------------------------ |
| `01-clean-studio`        | Mostly OK                   | Ready: normalize clean speech                          |
| `02-riverside-stereo`    | Silent mono downmix risk    | Needs review: preserve stereo, skip RNNoise            |
| `03-iphone-hvac`         | Blind processing            | Needs review: quiet noisy speech, denoise/gain warning |
| `04-cafe-music-intro`    | Music damage risk           | Needs review: protect music, disable destructive steps |
| `05-two-hour-livestream` | No progress/cancel clarity  | Needs review: long job warning, cancellable request    |
| `06-already-mastered`    | Reprocessed unnecessarily   | Ready: minimal processing                              |
| `07-archive-legacy-wav`  | Silent quality risk         | Needs review: legacy/clipping/DC warnings              |
| `08-near-silent`         | Generic failure             | Blocked: silent/unusable recording                     |
| `09-truncated-mp3`       | Generic failure             | Blocked: truncated media                               |
| `10-huge-wav`            | Rejects or stalls unclearly | Blocked: over backend budget                           |

## Top Logic Gaps Closed

Media preflight now produces a `ProcessingPlan` before processing starts. Live uploads use `ffprobe` when available and the deterministic rule engine handles the fixture profiles.

The pipeline is no longer one-size-fits-all. The plan can disable denoise, disable trim, skip normalization, preserve stereo, or block unsafe inputs.

Confidence, warnings, anomalies, and reasons are visible in the UI and returned by the API.

Errors now use an audio-domain shape: what failed, why it happened, what to do next, and whether the work is recoverable.

Exports include provenance headers with schema, app version, commit, profile, plan, options, confidence, warnings, anomalies, and generation time.

## Smart Behaviors

Upload now starts preflight immediately and shows a first guess.

Stereo speech is detected as risky for RNNoise and preserves channels by default.

Already-mastered audio skips unnecessary normalization/denoise/trim.

Silent, truncated, and huge files are blocked before destructive processing.

User corrections to processing settings are remembered for the session.

## Determinism

All 10 real-data fixtures pass byte-identical JSON determinism checks for repeated inference calls.

Synthetic edge profiles also produce stable plan IDs and statuses without panics.

## Performance

Fixture inference median: 8.944 us per 10-fixture pass.

Fixture inference worst: 9.628 us per 10-fixture pass.

Budget: under 50 ms per fixture.

Details: https://github.com/baditaflorin/podcast-postline/blob/main/docs/perf/phase2-inference.md

## What Surprised Me

The biggest risk was not loudness math. It was silent wrongness: stereo downmix, music denoise, and already-mastered reprocessing all looked like successes unless the app exposed what it believed.

The lightweight profile fixture approach made the logic testable without committing large copyrighted audio, but it also made the boundary between "media facts" and "inference decisions" very explicit.

## Still Open

1. Run full loudness/noise analysis in preflight for every live upload, not only when facts are already in fixtures or cheaply probed.
2. Add Docker integration tests that execute the real FFmpeg/RNNoise/pyloudnorm/SoX path on short generated audio.
3. Stream backend progress events instead of only exposing frontend request state.
4. Add a save-and-recover export of the current processing state.
5. Measure memory and runtime on real multi-hour audio inside the production container.

## Honest Take

It no longer feels like a toy at the decision layer: it can look at messy podcast inputs and make a useful, explainable first guess. It still has production hardening left around live loudness/noise measurement and long-running progress, but the app now behaves like an audio assistant instead of a fixed button wired to a pipeline.
