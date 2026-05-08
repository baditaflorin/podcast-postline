# 0007 - Static Data Pipeline

## Status

Accepted

## Context

Mode B projects need a scheduled or local artifact generation pipeline. This project is Mode C.

## Decision

No static data pipeline is used in v1.

## Consequences

- There is no `make data` artifact generation requirement beyond a no-op target.
- Runtime audio processing happens through the Docker backend.

## Alternatives Considered

- Pre-building example audio artifacts: rejected because they do not help user uploads.
