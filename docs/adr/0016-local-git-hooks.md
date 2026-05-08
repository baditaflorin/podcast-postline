# 0016 - Local Git Hooks

## Status

Accepted

## Context

The project does not use GitHub Actions, so local hooks carry the quality gate.

## Decision

Use plain `.githooks/` scripts wired by `make install-hooks`.

Hooks:

- `pre-commit`: formatting, lint/type checks when tools are installed, and `gitleaks protect --staged`.
- `commit-msg`: Conventional Commits validation.
- `pre-push`: `make test`, `make build`, and `make smoke`.
- `post-merge` and `post-checkout`: regenerate generated code placeholders.

## Consequences

- Contributors can run the same checks manually through Makefile targets.
- Missing optional tools produce actionable messages.

## Alternatives Considered

- lefthook: viable, but plain hooks avoid another dependency for v1.
