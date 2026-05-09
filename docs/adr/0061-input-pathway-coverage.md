# 0061 - Input Pathway Coverage Policy

## Status

Accepted

## Context

The product accepts podcast recordings. Before Phase 3 it only accepted one file through picker/drop, leaving batch, paste, sample, import, and deep-link flows incomplete.

## Decision

Supported v0.3 input pathways are:

- File picker, including multi-file selection.
- Drag/drop, including multi-file drops.
- Clipboard file paste when the browser exposes audio files.
- Permission-aware clipboard read button with domain guidance when unsupported.
- Generated sample WAV.
- Versioned `.postline.json` workspace import.
- Hash-based small workspace deep links.
- Autosaved workspace metadata and preferences.

Out of scope:

- Text/HTML/image paste, because the domain input is audio.
- Recursive folder upload, because browser support is non-standard and v1 does not need folder semantics.
- Browser-side arbitrary URL fetching, because CORS and private recording hosts make it unreliable. Users can download the file first or use the API snippet/server path.

## Consequences

The UI must explain URL/CORS limits in audio terms instead of presenting a broken URL input. Batch handling is local queue metadata; processing still runs one selected recording at a time.

## Alternatives Considered

- Add a browser URL input. Rejected because it would fail for many real podcast hosts and cloud-drive links.
- Add server URL ingestion. Rejected because it expands the backend threat model and is a new feature.
