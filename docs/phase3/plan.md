# Phase 3 Implementation Plan

Generated from the Phase 3 audits on 2026-05-10.

Ranking principle: real-user blockage first, code health second. Phase 2 audio inference remains locked.

| Rank | Catalog item   | Enhancement                                                                            | Evidence from audit                         | Verification                                   |
| ---: | -------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
|    1 | 1              | Multi-file picker accepts audio batches and creates a per-file queue.                  | File upload/multi-file red or yellow.       | E2E upload queue assertion.                    |
|    2 | 1, 4           | Multi-file drag/drop adds every dropped audio file and reports rejected files.         | Drag/drop silently ignored extras.          | E2E drop with two files.                       |
|    3 | 2              | Client-side input sniffing reports extension/MIME mismatch before preflight.           | Format detection absent.                    | Unit tests for audio file classifier.          |
|    4 | 6              | Clipboard read button handles browser support/permission and audio clipboard files.    | Clipboard path absent.                      | E2E fallback status and unit classifier tests. |
|    5 | 6              | Window paste handler accepts audio files from `paste` events.                          | Paste path absent.                          | E2E dispatch paste with a file.                |
|    6 | 7              | Generated sample WAV becomes a first-class input.                                      | Demo input absent.                          | E2E load sample and see queued job.            |
|    7 | 8, 38          | Autosave restores preferences and current workspace metadata.                          | Reload loses job context.                   | Unit test storage migration and e2e reload.    |
|    8 | 40             | Start fresh clears file, queue, provenance, errors, and autosave.                      | Reset status is partial.                    | E2E reset assertion.                           |
|    9 | 9, 11, 41      | Versioned workspace export/import round-trips deterministic state.                     | State round-trip absent.                    | Unit round-trip test.                          |
|   10 | 10             | Copy provenance JSON and automation snippets to clipboard with visible result.         | Copy output absent.                         | E2E clipboard fallback.                        |
|   11 | 12             | Hash-based share link for small workspace state.                                       | Deep link/share absent.                     | Unit encode/decode test.                       |
|   12 | 13             | Print stylesheet focuses on provenance and hides controls.                             | Print output absent.                        | CSS/static build check.                        |
|   13 | 14             | UI generates curl and Python API snippets from current settings.                       | API docs exist, UI output absent.           | E2E snippet visibility.                        |
|   14 | 15             | Triage half-baked controls in ADR 0063 and docs.                                       | Reset/provenance/session learning partial.  | ADR and postmortem.                            |
|   15 | 16, 18         | Finish kept half-baked settings/status controls.                                       | Reset and API URL validation partial.       | Unit/e2e.                                      |
|   16 | 19, 42, 43, 45 | README features and limitations match tested reality.                                  | Several README claims too broad.            | Docs diff and e2e claim coverage.              |
|   17 | 20             | Extract backend upload staging into a single helper.                                   | Duplicate multipart staging.                | Go unit tests and `go test`.                   |
|   18 | 21, 31         | Consolidate backend form parsing helpers and dead `writeError`.                        | Duplicate boolean parsing; unused function. | `go test`, `rg` audit.                         |
|   19 | 23, 35, 36, 37 | Validate API responses, provenance headers, and workspace state with zod.              | Direct casts at boundaries.                 | Vitest boundary tests.                         |
|   20 | 22, 32, 33     | Centralize frontend workspace/domain types and naming.                                 | State schema missing.                       | Typecheck.                                     |
|   21 | 24, 25         | Split large App responsibilities into helper modules/components where it reduces risk. | `App.tsx` 771 lines.                        | Line count and typecheck.                      |
|   22 | 28, 29         | Remove unused backend `writeError` and keep TODO count at zero.                        | Dead function found.                        | `rg` audit.                                    |
|   23 | 39             | Persisted workspace has schema version and migration from absent/old data.             | Migration policy absent.                    | Unit migration tests.                          |
|   24 | 44             | Inline guidance for URL/CORS and clipboard limitations, in domain terms.               | URL input out of scope but confusing.       | E2E guidance assertion.                        |
|   25 | 46, 47         | Stranger test in private-browser style and top-three fixes.                            | Mandatory Phase 3 gate.                     | `docs/phase3/stranger-test.md` and postmortem. |

Implementation batches:

1. ADRs 0060-0071.
2. Frontend input and workspace/output completion.
3. Backend DRY/type cleanup.
4. Tests and docs alignment.
5. Stranger test, postmortem, version bump, build, tag, push.
