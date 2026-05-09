# Phase 3 Feature Claims Audit

Baseline date: 2026-05-10

| Claim source | Claim                                                                   | Baseline status   | Finding                                                                                             | Phase 3 decision                                                  |
| ------------ | ----------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| README       | Upload a raw recording.                                                 | Shipped partially | Single-file upload works; multi-file and paste are absent.                                          | Make the wording true and add tests for upload/drop/sample paths. |
| README       | Denoise with RNNoise.                                                   | Shipped fully     | Real mode invokes the Python/native path; stub mode is documented for development.                  | Keep, clarify backend dependency in limitations.                  |
| README       | Normalize to `-16 LUFS` with `pyloudnorm`.                              | Shipped fully     | Real mode supports it; UI lets user change target.                                                  | Keep.                                                             |
| README       | Trim silence with SoX.                                                  | Shipped fully     | Real mode supports it and UI can disable it.                                                        | Keep.                                                             |
| README       | Export with FFmpeg.                                                     | Shipped fully     | Real mode exports MP3/WAV/M4A.                                                                      | Keep.                                                             |
| README       | Production backend image is published to GHCR after `make docker-push`. | Shipped partially | Build target exists, but the prior token could not push packages.                                   | Keep as operator instruction, add limitation/troubleshooting.     |
| README       | Live Pages URL is first-class.                                          | Shipped fully     | URL is present and Pages build exists in `docs/`.                                                   | Keep.                                                             |
| ADR 0044     | Confidence surfaces in UI and exports.                                  | Shipped partially | UI shows plan/provenance confidence; export headers carry it, but downloadable JSON does not exist. | Finish JSON/state export.                                         |
| ADR 0049     | Debug surface.                                                          | Shipped fully     | `?debug=1` shows internal state.                                                                    | Keep.                                                             |
| ADR 0050     | Remember corrections within session.                                    | Shipped partially | Session overrides exist for recommendation changes, but no visible activity/history.                | Finish with activity log and exported state.                      |
| In-app UI    | Publish-ready export.                                                   | Shipped partially | Audio download works; no provenance download or automation output.                                  | Finish output pathways.                                           |

Before count: green 6, yellow 5, red 0.
