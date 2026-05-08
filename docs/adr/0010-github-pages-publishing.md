# 0010 - GitHub Pages Publishing Strategy

## Status

Accepted

## Context

The live GitHub Pages URL must work from day one, and no GitHub Actions are used.

## Decision

Publish from the `main` branch `/docs` folder:

- Vite builds the frontend into `docs/`.
- `docs/index.html` is the app entry.
- `docs/404.html` is copied from the app entry for SPA fallback.
- ADRs and documentation remain inside `docs/`.
- The Makefile cleans only generated frontend assets so documentation is preserved.
- Vite `base` is `/podcast-postline/`.

## Consequences

- Built assets are committed to git.
- `.gitignore` ignores `dist/` but not `docs/`.
- Rollback is a normal git revert.

## Alternatives Considered

- `gh-pages` branch: rejected to keep local-only publishing simple.
- GitHub Actions Pages deployment: rejected because the project requires no GitHub Actions.
