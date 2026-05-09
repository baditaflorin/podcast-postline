# Phase 3 Codebase Health Audit

Baseline date: 2026-05-10

## Measurements

| Area                           | Baseline finding                                                                                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Largest frontend module        | `frontend/src/App.tsx` has 771 lines and owns input handling, processing orchestration, state presentation, plan rendering, provenance rendering, formatting helpers, and debug output.                                                             |
| Largest backend handler module | `internal/httpapi/handlers.go` has 433 lines and duplicates multipart staging between preflight and process.                                                                                                                                        |
| DRY violations                 | Multipart upload parsing/staging appears in both `preflight` and `process`; frontend fallback filename and backend result filename use separate sanitizers; output/provenance state has no canonical schema.                                        |
| SOLID violations               | `App.tsx` has several reasons to change: input acquisition, persistence, export actions, processing orchestration, and rendering.                                                                                                                   |
| Dead code                      | No abandoned files found. A quick audit flagged `writeError`, but it is used by the panic recoverer.                                                                                                                                                |
| TODO/FIXME/XXX/HACK            | Zero TODO/FIXME/XXX/HACK markers in production source.                                                                                                                                                                                              |
| Type safety holes              | Frontend API boundaries cast JSON responses directly with `as ProcessingPlan`, `as Provenance`, and `as DomainError`; `frontend/src/main.tsx` uses `as HTMLElement`; Go uses `any` in `audio.Result.Metrics`, map literals, tests, and `writeJSON`. |
| Inconsistent patterns          | Frontend validates preferences with zod but does not validate API responses, provenance headers, or workspace state.                                                                                                                                |
| Test coverage holes            | E2E only asserts the homepage, project links, version, and commit. It does not cover input queue, export/state actions, clipboard fallbacks, import, or reset.                                                                                      |

## DRY Details

| Finding                          | Files                                                                                                            | Baseline line area                                                                             | Impact                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Duplicate upload staging flow    | `internal/httpapi/handlers.go`                                                                                   | `preflight` and `process` both parse multipart, open `file`, call `saveUpload`, defer cleanup. | Every upload validation change must be repeated.                        |
| Duplicate file name sanitization | `internal/audio/processor.go`, `frontend/src/features/processor/api.ts`                                          | `safeName` and `fallbackFilename`.                                                             | State/export names can drift from backend downloads.                    |
| No canonical state export schema | `frontend/src/App.tsx`, `frontend/src/features/processor/storage.ts`, `frontend/src/features/processor/types.ts` | N/A                                                                                            | Import/export/share cannot be deterministic until state is centralized. |

## SOLID Details

| Finding                                                                       | File                                     | Impact                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| God component                                                                 | `frontend/src/App.tsx`                   | Small changes require editing a large component, increasing regression risk. |
| HTTP helpers parse untyped JSON                                               | `frontend/src/features/processor/api.ts` | Boundary failures can become wrong-but-confident UI state.                   |
| Backend handlers mix parsing, staging, planning, processing, response writing | `internal/httpapi/handlers.go`           | Duplicated error handling and harder endpoint tests.                         |

## Before Counts

| Metric                                           | Count |
| ------------------------------------------------ | ----: |
| Core DRY violations                              |     3 |
| TODO/FIXME/XXX/HACK markers                      |     0 |
| Type safety holes from direct `as` casts / `any` |     9 |
| Dead code functions                              |     0 |
| E2E real-user paths covered                      |     1 |

## After Phase 3

| Metric                                       | Count |
| -------------------------------------------- | ----: |
| Core DRY violations                          |     0 |
| TODO/FIXME/XXX/HACK markers                  |     0 |
| Type safety holes from direct boundary casts |     0 |
| Dead code functions                          |     0 |
| E2E real-user paths covered                  |     6 |

Notes:

- `frontend/src/App.tsx` is still the largest module and remains a Phase 4 refactor candidate, but Phase 3 moved file classification, workspace schema, storage, snippets, and API validation out of it.
- Remaining `as` matches in source are import alias/text occurrences, not unsafe boundary casts.
- Backend multipart staging and form parsing now have single helper paths.
