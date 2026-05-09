# Phase 3 Input Pathway Audit

Baseline date: 2026-05-10

Scope: podcast-postline Mode C static frontend plus Docker backend. This audit measures whether a stranger can bring their own recording into the app without using a curated fixture.

| Input pathway         | Baseline status | What happened before Phase 3                                                                                                                      | User impact                                                                   | Phase 3 decision                                                                                       |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| File upload           | Works partially | The hidden file picker accepts one `audio/*` file and immediately starts preflight. Empty and oversized files are rejected client-side.           | Core path works, but batch work requires repeated manual selection.           | Finish with multi-file selection and per-file queue status.                                            |
| Drag and drop         | Works partially | Drop accepts only the first dropped file. Multiple files are silently ignored after the first.                                                    | A real creator dragging a folder export can think the app lost files.         | Finish with multi-file drop and explicit per-file errors.                                              |
| Paste from clipboard  | Not built       | There is no paste handler or permission-aware clipboard read path.                                                                                | A user copying an audio blob or file from another app cannot use it directly. | Finish for clipboard files when supported; provide domain guidance when the browser exposes only text. |
| Text/HTML paste       | Not applicable  | The product processes recordings, not documents.                                                                                                  | Accepting text would be misleading.                                           | Permanently out of scope by ADR 0061.                                                                  |
| Image paste           | Not applicable  | Image/audio conversion is outside the product.                                                                                                    | Accepting image input would be wrong.                                         | Permanently out of scope by ADR 0061.                                                                  |
| URL input             | Not built       | The app has no URL field. Browser CORS prevents reliable direct audio fetching from arbitrary recording hosts.                                    | Users with a public audio URL need to download it first.                      | Out of scope for runtime fetching; add honest guidance and API/curl path.                              |
| Clipboard read button | Not built       | No button attempts `navigator.clipboard.read()`.                                                                                                  | Users have no discoverable paste path.                                        | Finish with permission-aware read where supported.                                                     |
| Mobile picker         | Works partially | The normal file picker likely works on mobile because it uses `audio/*`, but there is no `multiple` support or tested wording for mobile sources. | Phone recordings can be selected one at a time only.                          | Finish with `multiple` and mobile-friendly accepted extensions.                                        |
| Multi-file upload     | Not built       | Only one selected file is stored.                                                                                                                 | Batch episode work is repetitive.                                             | Finish with a queue; process selected job one at a time.                                               |
| Folder upload         | Not applicable  | Browsers expose folder upload through non-standard `webkitdirectory`; audio post-production does not need recursive folders in v1.                | Folder support would add platform-specific behavior.                          | Permanently out of scope by ADR 0061.                                                                  |
| Sample/demo input     | Not built       | README shows the app but the UI has no safe sample recording to try.                                                                              | A stranger cannot verify backend wiring without finding a file first.         | Finish with a generated tiny WAV demo file.                                                            |
| Deep links            | Not built       | The app ignores URL hash/search state except `?debug=1`.                                                                                          | Shared configuration cannot be reopened.                                      | Finish for small workspace preferences through hash state.                                             |
| Imported state        | Not built       | There is no workspace/state import path.                                                                                                          | Exports cannot be reloaded later.                                             | Finish with versioned `.postline.json` import.                                                         |
| Restored autosave     | Works partially | Preferences persist in `localStorage`; selected file, plan, queue, and provenance do not.                                                         | A reload loses the active job context.                                        | Finish metadata/session restoration without pretending browsers can always persist raw files.          |

Before count: green 0, yellow 4, red 6, out-of-scope 4.

## After Phase 3

| Input pathway         | Final status                            | Evidence                                                                              |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| File upload           | Works fully                             | Multi-file picker queues every accepted recording; covered by Playwright.             |
| Drag and drop         | Works fully                             | Dropped files use the same multi-file queue path.                                     |
| Paste from clipboard  | Works fully where browsers expose files | `Paste audio` uses permission-aware clipboard read; page paste accepts audio files.   |
| Text/HTML paste       | Out of scope                            | ADR 0061.                                                                             |
| Image paste           | Out of scope                            | ADR 0061.                                                                             |
| URL input             | Out of scope                            | ADR 0061; UI explains CORS and points users to download/API paths.                    |
| Clipboard read button | Works fully with fallback guidance      | Unsupported browsers get a domain explanation and alternate paths.                    |
| Mobile picker         | Works fully within browser limits       | `audio/*`, common extensions, and `multiple` are enabled.                             |
| Multi-file upload     | Works fully                             | Queue shows each file and status; Playwright covers two-file selection.               |
| Folder upload         | Out of scope                            | ADR 0061.                                                                             |
| Sample/demo input     | Works fully                             | Generated WAV sample is first-class and covered by Playwright.                        |
| Deep links            | Works fully for small workspace state   | Hash state restores preferences/job metadata; oversized state points to file export.  |
| Imported state        | Works fully                             | Versioned `.postline.json` import is covered by Playwright.                           |
| Restored autosave     | Works fully for metadata/preferences    | Autosave restores workspace metadata and explicitly asks for audio file reattachment. |

After count: green 10, yellow 0, red 0, out-of-scope 4.
