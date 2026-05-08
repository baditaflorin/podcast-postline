# API

OpenAPI spec: https://github.com/baditaflorin/podcast-postline/blob/main/api/openapi.yaml

Default local base URL: http://localhost:8080

## Health

```sh
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

## Version

```sh
curl http://localhost:8080/api/version
```

## Process Audio

```sh
curl -fS \
  -F "file=@episode.wav;type=audio/wav" \
  -F "target_lufs=-16" \
  -F "format=mp3" \
  -F "trim_silence=true" \
  http://localhost:8080/api/process \
  -o episode-postline.mp3
```

Supported formats: `mp3`, `wav`, `m4a`.

The response includes `Content-Disposition` and `X-Postline-Version` headers.
