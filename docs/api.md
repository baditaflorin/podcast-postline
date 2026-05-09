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

Run preflight first when the client needs the inferred plan before processing.

```sh
curl -fS \
  -F "file=@episode.wav;type=audio/wav" \
  -F "target_lufs=-16" \
  http://localhost:8080/api/preflight
```

The preflight response includes the stable `plan_id`, inferred media profile,
recommended settings, confidence, warnings, and blockers.

```sh
curl -fS \
  -F "file=@episode.wav;type=audio/wav" \
  -F "target_lufs=-16" \
  -F "format=mp3" \
  -F "trim_silence=true" \
  -F "denoise=true" \
  -F "normalize=true" \
  -F "preserve_stereo=false" \
  http://localhost:8080/api/process \
  -o episode-postline.mp3
```

Supported formats: `mp3`, `wav`, `m4a`.

The response includes `Content-Disposition`, `X-Postline-Version`,
`X-Postline-Provenance`, `X-Postline-Confidence`, `X-Postline-Plan`, and
`X-Postline-Warnings` headers.
