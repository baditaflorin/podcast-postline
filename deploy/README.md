# Server Deployment

Frontend URL: https://baditaflorin.github.io/podcast-postline/

Backend image: ghcr.io/baditaflorin/podcast-postline:latest

## Prerequisites

- Linux amd64 server
- Docker Engine with Compose plugin
- DNS record pointing your backend domain to the server
- Let's Encrypt certificates mounted under `/etc/letsencrypt`

## First-Time Setup

1. Copy `deploy/` to the server.
2. Create `deploy/.env` from `.env.example`.
3. Replace `example.com` in `deploy/nginx/nginx.conf` with the backend domain.
4. Run `docker compose pull`.
5. Run `docker compose up -d`.

## Public Port

nginx exposes HTTPS on host port `25342`.

## Logs

Run:

```sh
docker compose logs -f app
docker compose logs -f nginx
```

## Metrics

Prometheus is optional:

```sh
docker compose --profile metrics up -d prometheus
```

Public `/metrics` access is blocked by nginx.

## Rollback

Pin the previous image tag in `docker-compose.yml`, then run:

```sh
docker compose pull
docker compose up -d
```

## Backups

The app stores only temporary uploaded and processed files in `/tmp`; no persistent app data is required in v1.

