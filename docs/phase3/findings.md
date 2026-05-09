# Phase 3 Findings Synthesis

Baseline date: 2026-05-10

## Top 5 Usability Gaps

1. Batch input is missing. Dragging multiple recordings silently keeps only the first file.
2. Output stops at the audio file. Users cannot download or copy the processing plan, provenance, or automation command.
3. State cannot round-trip. A user cannot export a workspace, import it in another browser, or share small settings by URL.
4. Paste/clipboard workflows are absent. This blocks users moving audio between desktop apps and browser.
5. The app has no safe sample/demo input, so a stranger cannot verify the live flow without supplying a recording.

## Top 5 Half-Baked Features

| Feature | Decision | Rationale |
| --- | --- | --- |
| Reset status | Finish | Current behavior resets only mutation state; users need explicit active-job reset and fresh-start reset. |
| Session correction memory | Finish | It exists internally but is not visible or exported. |
| Provenance display | Finish | It is visible, but cannot be downloaded/copied. |
| Debug surface | Finish | It should include Phase 3 queue/state/export metadata. |
| GHCR publication claim | Finish docs | The make target exists, but the docs need the package-token limitation. |

## Top 5 Codebase Pain Points

1. `frontend/src/App.tsx` is too broad at 771 lines.
2. API JSON is trusted with TypeScript casts instead of zod validation.
3. Backend upload staging is duplicated between endpoints.
4. Workspace state has no canonical schema or migration policy.
5. E2E tests do not exercise real user paths beyond initial render.

## Top 5 Documentation/Reality Mismatches

1. README implies a complete upload flow but does not mention single-file limitation.
2. ADR 0044 promises confidence in exports, but no downloadable JSON export exists.
3. ADR 0050 describes session learning, but users cannot inspect or preserve it.
4. README production image wording does not warn about the required GHCR package write scope.
5. Quickstart reaches a dev app, but no user story test verifies sample input or state export.

## Fully Usable Means

1. A stranger can load one or more audio files through picker, drag/drop, clipboard when supported, or generated sample.
2. The app makes the same Phase 2 preflight decision for every queued file and never silently ignores extra files.
3. The user can export audio, provenance JSON, workspace state, and a runnable API command.
4. The user can reload or import a workspace and recover the meaningful settings/job metadata.
5. Every visible control has a tested end-to-end behavior or is documented out of scope.

## Phase 3 Success Metrics

| Metric | Target |
| --- | ---: |
| Input audit green or ADR-out-of-scope rows | 100% |
| Output audit green or ADR-out-of-scope rows | 100% |
| Core DRY violations remaining | 0 |
| Production TODO/FIXME/XXX/HACK markers | 0 |
| Frontend API boundary direct casts | 0 |
| Real-user E2E paths | At least 4 |
| Workspace export/import deterministic round-trip | 100% in unit tests |

## Out of Scope

- No new audio DSP behavior or changes to Phase 2 inference rules.
- No visual polish pass, theme work, animations, command palette, or marketing content.
- No architecture escalation beyond Mode C.
- No arbitrary URL fetching from the browser because CORS and credentials make it unreliable for v1.
- No folder recursion, CSV export, embed codes, screenshot export, or image/text processing.

