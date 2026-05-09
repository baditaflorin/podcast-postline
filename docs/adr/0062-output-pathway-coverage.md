# 0062 - Output Pathway Coverage Policy

## Status

Accepted

## Context

Before Phase 3, a processed audio download existed, but users could not take provenance, workspace state, or automation commands out of the app.

## Decision

Supported v0.3 output pathways are:

- Processed audio download.
- Provenance JSON download and copy.
- Versioned workspace state download.
- Workspace state import round-trip.
- Shareable URL hash for small workspace state.
- Print-friendly provenance/status output.
- API/curl and Python snippets for the current settings.

Out of scope:

- CSV, because output is not tabular.
- Screenshot export, because browser/OS screenshot tools already cover this.
- Embed code, because the product is not a hosted audio player.

## Consequences

Every exported non-audio artifact uses a deterministic schema with a version. Raw audio bytes are excluded from workspace/share state.

## Alternatives Considered

- Export every possible artifact format. Rejected because it would create untested surface.
- Store audio blobs inside workspace JSON. Rejected because files can be large and browser memory limits vary.

