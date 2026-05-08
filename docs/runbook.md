# Runbook

Frontend: https://baditaflorin.github.io/podcast-postline/

Repository: https://github.com/baditaflorin/podcast-postline

## Expected Resources

- CPU: 2 cores recommended for long episodes.
- RAM: 3 GB recommended for 60-minute files.
- Disk: temporary space at least 3x the uploaded file size.

## Debugging

Check backend health:

```sh
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

Check logs:

```sh
docker compose -f deploy/docker-compose.yml logs -f app
docker compose -f deploy/docker-compose.yml logs -f nginx
```

Run a stub smoke locally:

```sh
make smoke
```

## Common Failures

- `rnnoise_demo not found`: confirm the Docker image built RNNoise and `RNNOISE_DEMO` points to `/usr/local/bin/rnnoise_demo`.
- `could not measure integrated loudness`: input may be silent or unreadable.
- Browser CORS error: confirm `ALLOWED_ORIGINS` includes `https://baditaflorin.github.io`.
- Upload fails at nginx: confirm `client_max_body_size` is at least the backend upload limit.

## Metrics

Prometheus endpoint: http://localhost:8080/metrics

Public `/metrics` access is blocked in nginx.

## Backup

No persistent state exists in v1. Uploaded and generated files are temporary and removed after each request.
