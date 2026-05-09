# Phase 2 Substance Real-Data Audit

Date: 2026-05-08

Product: `podcast-postline`

Mode: C, GitHub Pages frontend plus Docker backend

## Fixture Set

The fixture set uses compact media-profile inputs under `test/fixtures/realdata/` rather than committing large copyrighted recordings. Each profile represents a real-world input class podcast editors routinely receive, with an expected-output file that the inference suite checks.

| #   | Fixture                  | Real-World Input                                               | v1 Behavior                                                 | Expected Phase 2 Behavior                                                                             | Failure Kind                  |
| --- | ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | `01-clean-studio`        | Clean 48 kHz mono studio WAV, normal speech, modest room tone. | Processes with defaults and likely succeeds.                | High-confidence plan: denoise lightly, normalize to -16 LUFS, trim only true dead air.                | Mostly OK.                    |
| 2   | `02-riverside-stereo`    | Riverside/Zoom stereo M4A, two speakers split across channels. | Downmixes to mono silently.                                 | Detect stereo speech, preserve stereo, warn that RNNoise is skipped unless mono is requested.         | Silent wrongness.             |
| 3   | `03-iphone-hvac`         | iPhone Voice Memo M4A, quiet speaker, steady HVAC noise.       | Runs the same pipeline blindly.                             | Detect quiet noisy speech, recommend denoise plus normalization, warn about large gain.               | Wrong-but-confident risk.     |
| 4   | `04-cafe-music-intro`    | Café/field recording with music intro and speech later.        | RNNoise and trim may damage the intro.                      | Detect mixed music/speech, lower confidence, keep trim conservative, warn before destructive denoise. | Wrong-but-confident.          |
| 5   | `05-two-hour-livestream` | Two-hour VBR MP3 with long pauses.                             | Synchronous request with no useful progress or cancel path. | Mark long job, expose cancellable processing and progress states, preserve user state.                | Stuck/unclear.                |
| 6   | `06-already-mastered`    | Mastered podcast MP3 already near -16 LUFS.                    | Reprocesses anyway.                                         | Detect compliance and recommend minimal/no normalization.                                             | Feels stupid.                 |
| 7   | `07-archive-legacy-wav`  | Old 22.05 kHz 8-bit WAV with DC offset and clipping.           | Decodes without a domain warning.                           | Detect legacy format, clipping, DC offset, and resampling risk.                                       | Silent quality risk.          |
| 8   | `08-near-silent`         | Accidental empty/near-silent recording.                        | Loudness measurement fails or generic backend error.        | Fail gracefully: "file appears silent"; do not produce output.                                        | Obvious but poor explanation. |
| 9   | `09-truncated-mp3`       | Truncated MP3 from failed transfer.                            | Generic "audio processing failed."                          | Detect unreadable/truncated media and suggest re-upload/export from source.                           | Unactionable failure.         |
| 10  | `10-huge-wav`            | Huge WAV beyond normal upload/runtime budget.                  | Rejects or stalls with little guidance.                     | Preflight size/duration risk, explain backend limit and next step.                                    | Stuck/unclear.                |

## Top 5 Logic Gaps

1. No media preflight: v1 does not inspect duration, channels, codec, loudness, silence, clipping, corruption, or scale before processing.
2. One-size-fits-all pipeline: every file gets the same denoise/downmix/normalize/trim behavior.
3. No confidence model: the app never says "I am unsure," even for silence, music, stereo, huge, or noisy files.
4. Generic error handling: FFmpeg/RNNoise/pyloudnorm failures collapse into "audio processing failed."
5. No deterministic provenance: exports and API responses do not carry enough stable metadata to reproduce the run.

## Top 3 Intuition Failures

1. Stereo input silently becomes mono.
2. Long processing has no meaningful progress or cancellation.
3. Already-good audio is still processed as if it were raw.

## Top 3 Feels-Stupid Moments

1. The user has to guess whether the file is safe to process.
2. The user has to guess why an upload failed.
3. The user has to trust the result without seeing what the app inferred about loudness, clipping, trim, or denoise risk.

## What Smart Means

- On upload, the app immediately analyzes the recording and returns a first guess: ready, already mastered, stereo speech, noisy quiet speech, mixed music/speech, silent, corrupted, huge, or legacy-risk.
- The processing plan adapts instead of applying one destructive path to every recording.
- Every inference has confidence and a short reason.
- Every error says what failed, why in audio terms, and what the user can do next.
- Every export response carries provenance: schema version, app version, commit, input fingerprint, parameters, warnings, and measured/inferred facts.

## Phase 2 Substance Success Metrics

- At least 7 of 10 real-data fixtures produce a usable processing plan without manual setting changes.
- 10 of 10 fixtures never crash, hang, or leave the UI stuck.
- 10 of 10 failures are domain-specific and actionable.
- 10 of 10 fixture outputs are deterministic for identical input and parameters.
- Preflight inference for fixture profiles completes in under 50 ms in unit tests.
- Frontend exposes progress within 300 ms and cancellation during processing.
- Every processing response includes structured provenance headers.

## Final Phase 2 Result

- 7 of 10 fixtures now produce a usable processing plan without manual setting changes.
- 3 of 10 fixtures are intentionally blocked with domain-specific explanations: silent/unusable, truncated media, and over backend budget.
- 10 of 10 fixtures pass deterministic inference tests.
- 5 synthetic edge profiles cover empty, huge, truncated, unknown-format, and Unicode-name inputs without panics.
- Median fixture inference benchmark: 8.944 us per 10-fixture pass.
- Frontend states now cover preflighting, needs-review, blocked, processing, processed, recoverable error, cancellation, and debug inspection.

## Out of Scope

- No new product category or feature surface beyond smarter upload/process/export behavior.
- No UI polish pass, dark mode, command palette, marketing additions, or visual redesign.
- No architecture mode change.
- No accounts, cloud storage, cross-device history, or collaboration.
- No manual waveform editor.
- No real-time live-stream processing.
