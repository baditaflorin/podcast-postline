# Phase 3 Output Pathway Audit

Baseline date: 2026-05-10

| Output pathway | Baseline status | What happened before Phase 3 | User impact | Phase 3 decision |
| --- | --- | --- | --- | --- |
| Processed audio download | Works fully | The backend streams the processed file with `Content-Disposition`; the UI exposes a download link after processing. | Core export works after a successful run. | Keep and regression-test. |
| JSON export | Not built | Provenance is shown in UI but not downloadable as JSON. | Users cannot audit or archive the exact processing plan. | Finish with deterministic provenance/workspace JSON export. |
| CSV export | Not applicable | Podcast processing output is not tabular. | CSV would be fake value. | Permanently out of scope by ADR 0062. |
| Copy to clipboard | Not built | No output or API snippet can be copied. | Users must manually select text from the page or devtools. | Finish for provenance JSON and automation commands. |
| Downloadable state file | Not built | No canonical workspace export exists. | Users cannot move a job configuration between browsers or preserve it before reset. | Finish with versioned `.postline.json`. |
| Share link | Not built | No hash-encoded state exists. | Small configurations cannot be shared. | Finish for preferences and job metadata, excluding raw audio bytes. |
| Print-friendly output | Not built | Browser print includes the full app chrome. | Provenance reviews are awkward for client or production notes. | Finish with print CSS and provenance-focused print content. |
| Screenshot export | Not applicable | Screenshots are a browser/OS feature, not a domain artifact. | Building this would add surface without improving post-production. | Permanently out of scope by ADR 0062. |
| Embed code | Not applicable | The product is not a hosted audio player. | Embed code would misrepresent the app. | Permanently out of scope by ADR 0062. |
| API/curl-ready output | Not built | API docs exist, but the UI does not produce a command for the current settings. | Automation-minded users cannot easily reproduce the run. | Finish with curl and Python snippets. |
| Round-trip import | Not built | There is no state export/import pair. | A user cannot verify reproducibility outside the same tab. | Finish and test with deterministic state schema. |

Before count: green 1, yellow 0, red 6, out-of-scope 4.

