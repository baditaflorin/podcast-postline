# 0014 - Error Handling Conventions

## Status

Accepted

## Context

The API must return clear errors and avoid panics. The user requested a shared Go helper named `HandleErrorOrLogWithMessages`.

## Decision

Use wrapped Go errors with `%w`. Handlers map known errors to stable JSON responses. `internal/utils.HandleErrorOrLogWithMessages(err, errMsg, successMsg)` centralizes success/error logging for command-style flows.

The Python pipeline exits non-zero with a concise stderr message and prints machine-readable JSON metrics on success.

## Consequences

- Errors keep context for logs.
- API responses avoid leaking paths or stack traces.

## Alternatives Considered

- Panics for impossible states: rejected; handlers return errors instead.

