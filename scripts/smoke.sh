#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
TMP="$ROOT/tmp/smoke"
PORT="${SMOKE_PORT:-18080}"
SERVER_PID=""

cd "$ROOT"

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

mkdir -p "$TMP"

PROCESSOR_MODE=stub PORT="$PORT" WORK_DIR="$TMP" CGO_ENABLED=0 go run ./cmd/server > "$TMP/server.log" 2>&1 &
SERVER_PID="$!"

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS "http://127.0.0.1:$PORT/readyz" >/dev/null
curl -fsS "http://127.0.0.1:$PORT/api/version" >/dev/null
curl -fsS "http://127.0.0.1:$PORT/metrics" >/dev/null
printf 'fake audio' > "$TMP/fake.wav"
curl -fsS \
  -F "file=@$TMP/fake.wav;type=audio/wav" \
  -F "target_lufs=-16" \
  -F "format=mp3" \
  -F "trim_silence=true" \
  "http://127.0.0.1:$PORT/api/process" \
  -o "$TMP/output.mp3" >/dev/null
test -s "$TMP/output.mp3"

if command -v npx >/dev/null 2>&1; then
  npm run e2e
else
  echo "npx not found; skipping Playwright smoke"
fi

echo "smoke ok"
