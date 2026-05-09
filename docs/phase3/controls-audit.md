# Phase 3 Controls Audit

Baseline date: 2026-05-10

| Control                         | Baseline status | Handler behavior before Phase 3                                                    | Phase 3 decision                                                    |
| ------------------------------- | --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| GitHub link                     | Works fully     | Opens https://github.com/baditaflorin/podcast-postline.                            | Keep.                                                               |
| PayPal link                     | Works fully     | Opens https://www.paypal.com/paypalme/florinbadita.                                | Keep.                                                               |
| Drop zone click/keyboard        | Works fully     | Opens native file picker for one audio file.                                       | Extend to multi-file.                                               |
| Drop zone drag/drop             | Works partially | Accepts first dropped file only.                                                   | Finish multi-file drop.                                             |
| Clear file button               | Works partially | Clears selected file and status, but not any future queue because no queue exists. | Expand to clear active job only and add explicit fresh-start reset. |
| Retry preflight                 | Works fully     | Re-runs preflight for selected file.                                               | Keep.                                                               |
| Target LUFS slider              | Works fully     | Updates and persists target.                                                       | Keep.                                                               |
| Target LUFS number input        | Works fully     | Updates and persists target; schema validates before process.                      | Keep.                                                               |
| Export format segmented control | Works fully     | Updates and persists selected format.                                              | Keep.                                                               |
| Denoise speech toggle           | Works fully     | Updates and persists; backend receives value.                                      | Keep.                                                               |
| Normalize loudness toggle       | Works fully     | Updates and persists; backend receives value.                                      | Keep.                                                               |
| Trim silence toggle             | Works fully     | Updates and persists; backend receives value.                                      | Keep.                                                               |
| Preserve stereo toggle          | Works fully     | Updates and persists; backend receives value.                                      | Keep.                                                               |
| API base URL input              | Works partially | Persists immediately but invalid URL error appears only when processing starts.    | Add validation status and include it in workspace export/import.    |
| Run postline button             | Works fully     | Sends current file and options to backend unless blocked/busy.                     | Keep.                                                               |
| Cancel button                   | Works fully     | Aborts preflight/process and restores a reachable state.                           | Keep.                                                               |
| Reset status button             | Works partially | Clears mutation/error state but not file, plan, provenance, or preferences.        | Rename behavior through new explicit reset actions.                 |
| Download link                   | Works fully     | Downloads processed file.                                                          | Keep and add provenance/state exports.                              |
| Debug query `?debug=1`          | Works fully     | Shows internal state JSON.                                                         | Keep and include Phase 3 state.                                     |

Before count: green 14, yellow 4, red 0.

## After Phase 3

| Control group     | Final status | Evidence                                                                            |
| ----------------- | ------------ | ----------------------------------------------------------------------------------- |
| Project links     | Works fully  | Existing Playwright metadata test.                                                  |
| Input actions     | Works fully  | Sample, paste guidance, import state, and start fresh are wired.                    |
| Picker/drop zone  | Works fully  | Multi-file picker/drop uses shared queue path.                                      |
| Queue controls    | Works fully  | Selecting queued files triggers preflight; busy operations block unsafe switching.  |
| Settings controls | Works fully  | Preferences persist and are included in workspace export/import.                    |
| API base URL      | Works fully  | URL validity is visible before processing.                                          |
| Run/cancel/reset  | Works fully  | Processing, cancellation, active status reset, and fresh-start reset are reachable. |
| Output actions    | Works fully  | State download, share link, provenance, copy, snippets, and print are wired.        |
| Debug surface     | Works fully  | `?debug=1` includes queue/workspace/activity state.                                 |

After count: green 18, yellow 0, red 0.
