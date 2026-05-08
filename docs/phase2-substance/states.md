# Phase 2 State Taxonomy

Every state has at least one user-actionable exit.

| State | Meaning | Exit |
|---|---|---|
| `idle` | No file selected. | Select or drop a file. |
| `selected` | File selected, preflight not started yet. | Start preflight automatically or clear file. |
| `preflighting` | Uploading file for analysis. | Cancel request or clear file. |
| `ready` | Preflight succeeded and plan is usable. | Run processing, change settings, clear file. |
| `needs-review` | Preflight succeeded with low-confidence or risky inferences. | Accept plan, adjust settings, or clear file. |
| `blocked` | Input cannot be processed safely, such as silent/corrupt/too large. | Clear file or choose another file. |
| `processing` | Backend is processing the recording. | Cancel request. |
| `processed` | Export is ready. | Download, run again, clear file. |
| `error-recoverable` | Request failed but the file/settings are preserved. | Retry, change settings, clear file. |
| `error-fatal` | App state is invalid or unrecoverable. | Refresh page; no user media is persisted. |

