# Phase 3 Controls Audit

Baseline date: 2026-05-10

| Control | Baseline status | Handler behavior before Phase 3 | Phase 3 decision |
| --- | --- | --- | --- |
| GitHub link | Works fully | Opens https://github.com/baditaflorin/podcast-postline. | Keep. |
| PayPal link | Works fully | Opens https://www.paypal.com/paypalme/florinbadita. | Keep. |
| Drop zone click/keyboard | Works fully | Opens native file picker for one audio file. | Extend to multi-file. |
| Drop zone drag/drop | Works partially | Accepts first dropped file only. | Finish multi-file drop. |
| Clear file button | Works partially | Clears selected file and status, but not any future queue because no queue exists. | Expand to clear active job only and add explicit fresh-start reset. |
| Retry preflight | Works fully | Re-runs preflight for selected file. | Keep. |
| Target LUFS slider | Works fully | Updates and persists target. | Keep. |
| Target LUFS number input | Works fully | Updates and persists target; schema validates before process. | Keep. |
| Export format segmented control | Works fully | Updates and persists selected format. | Keep. |
| Denoise speech toggle | Works fully | Updates and persists; backend receives value. | Keep. |
| Normalize loudness toggle | Works fully | Updates and persists; backend receives value. | Keep. |
| Trim silence toggle | Works fully | Updates and persists; backend receives value. | Keep. |
| Preserve stereo toggle | Works fully | Updates and persists; backend receives value. | Keep. |
| API base URL input | Works partially | Persists immediately but invalid URL error appears only when processing starts. | Add validation status and include it in workspace export/import. |
| Run postline button | Works fully | Sends current file and options to backend unless blocked/busy. | Keep. |
| Cancel button | Works fully | Aborts preflight/process and restores a reachable state. | Keep. |
| Reset status button | Works partially | Clears mutation/error state but not file, plan, provenance, or preferences. | Rename behavior through new explicit reset actions. |
| Download link | Works fully | Downloads processed file. | Keep and add provenance/state exports. |
| Debug query `?debug=1` | Works fully | Shows internal state JSON. | Keep and include Phase 3 state. |

Before count: green 14, yellow 4, red 0.

