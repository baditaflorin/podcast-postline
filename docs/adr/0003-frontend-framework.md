# 0003 - Frontend Framework and Build Tooling

## Status

Accepted

## Context

The UI needs upload state, validation, progress feedback, a processing form, and stable GitHub Pages builds.

## Decision

Use React, TypeScript strict mode, Vite, Tailwind CSS, Zod, TanStack Query, and lucide-react.

## Consequences

- Vite builds hashed assets into `docs/`.
- React keeps the UI compact and testable.
- Zod validates runtime configuration and API inputs client-side.
- TanStack Query handles mutation state and retry behavior.

## Alternatives Considered

- Vanilla TypeScript: viable, but state and accessibility details become more bespoke.
- Svelte: viable, but React has broader ecosystem support for the selected libraries.
