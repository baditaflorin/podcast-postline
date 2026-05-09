# Phase 3 Postmortem

Date: 2026-05-10

Version: v0.3.0

## Audit Grids

| Audit           | Before green/yellow/red/out | After green/yellow/red/out |
| --------------- | --------------------------: | -------------------------: |
| Input pathways  |               0 / 4 / 6 / 4 |             10 / 0 / 0 / 4 |
| Output pathways |               1 / 0 / 6 / 4 |              8 / 0 / 0 / 3 |
| Controls        |              14 / 4 / 0 / 0 |             18 / 0 / 0 / 0 |
| Feature claims  |               6 / 5 / 0 / 0 |             11 / 0 / 0 / 0 |

## Half-Baked Triage

| Feature                   | Outcome                 | Rationale                                                                                     |
| ------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Reset status              | Finished                | Active status reset remains, and `Start fresh` now clears queue, errors, autosave, and state. |
| Session correction memory | Finished                | Overrides are included in workspace/debug state and activity captures setting changes.        |
| Provenance display        | Finished                | Provenance is visible, copyable, and downloadable as JSON.                                    |
| Debug surface             | Finished                | Debug state now includes queue, workspace, activity, preferences, and provenance.             |
| GHCR publication claim    | Finished in docs        | README now calls out the required package write scope.                                        |
| URL input                 | Documented out of scope | Browser CORS makes arbitrary audio URL ingestion unreliable.                                  |
| Folder input              | Documented out of scope | Non-standard browser behavior and not needed for v0.3.0.                                      |

## Codebase Health

| Metric                         | Before | After |
| ------------------------------ | -----: | ----: |
| Core DRY violations            |      3 |     0 |
| TODO/FIXME/XXX/HACK markers    |      0 |     0 |
| Direct frontend boundary casts |      4 |     0 |
| Go `any` uses in source        |      4 |     0 |
| Dead code functions            |      0 |     0 |
| E2E real-user paths            |      1 |     6 |

The largest remaining code smell is `frontend/src/App.tsx`, which grew while the UI surface became real. Phase 3 extracted file classification, workspace schemas, snippets, storage, and API validation, but a Phase 4 refactor should split the input and output panels into focused components.

## Stranger Test

Self-run private-browser style testing covered sample input, multi-file picker, workspace export/import, share links, mocked processing, provenance actions, snippets, and fresh start.

Top issues addressed:

1. Share-link cap was too low for a one-job workspace; raised to 8000 characters and tested.
2. Cross-origin provenance headers needed explicit test modeling; e2e now exposes and asserts them.
3. Imported state needed to stay honest about missing local audio; imported jobs remain in `Reattach audio`.

## Documentation Reality

README now includes verified features and limitations. Claims about upload, provenance, state round-trip, snippets, and GHCR publishing now match implemented and tested behavior.

## Surprises

- A share link containing even one full plan/provenance-shaped workspace is larger than expected.
- The browser file input is announced as a button with the active recording name, which made locator ambiguity visible during tests.
- The app is much more useful with a generated sample because it lets users verify backend wiring before finding a real recording.

## Still Open

1. Split `App.tsx` into input panel, output panel, and activity/debug components.
2. Add a real external-human stranger test instead of the self-run substitute.
3. Add drag/drop-specific Playwright coverage with `DataTransfer`.
4. Add optional IndexedDB raw-file persistence for small files if storage quota checks are reliable.
5. Generate a typed client from OpenAPI instead of maintaining frontend schemas by hand.

## Honest Take

Could a stranger use this for their own real work end-to-end with zero help? Yes, if they have local audio files and a configured backend URL. They can load multiple recordings, get a preflight guess, process one, download audio, export provenance, preserve workspace state, and start over.

Still no for users who only have a private cloud URL and expect the browser to fetch it directly. That is explicitly out of scope for v0.3.0 because CORS makes it unreliable without adding a server-side ingestion feature.
