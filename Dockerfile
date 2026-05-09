# syntax=docker/dockerfile:1.7

ARG GO_VERSION=1.26.3
ARG PYTHON_VERSION=3.12

FROM golang:${GO_VERSION}-alpine AS go-builder
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
ARG VERSION=0.3.0
ARG COMMIT=dev
ARG CREATED=unknown
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -trimpath \
  -ldflags="-s -w -X github.com/baditaflorin/podcast-postline/internal/version.Version=${VERSION} -X github.com/baditaflorin/podcast-postline/internal/version.Commit=${COMMIT} -X github.com/baditaflorin/podcast-postline/internal/version.Date=${CREATED}" \
  -o /out/postline-server ./cmd/server

FROM python:${PYTHON_VERSION}-slim-bookworm AS audio-builder
ARG RNNOISE_REF=master
RUN apt-get update && apt-get install -y --no-install-recommends \
  autoconf \
  automake \
  ca-certificates \
  ffmpeg \
  gcc \
  git \
  libc6 \
  libsndfile1 \
  libsox-fmt-all \
  libtool \
  make \
  pkg-config \
  sox \
  xz-utils \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /build
RUN git clone --depth 1 --branch "${RNNOISE_REF}" https://gitlab.xiph.org/xiph/rnnoise.git
WORKDIR /build/rnnoise
RUN ./autogen.sh && ./configure --prefix=/usr/local && make -j"$(nproc)"
RUN install -m 0755 examples/rnnoise_demo /usr/local/bin/rnnoise_demo
RUN python -m pip install --no-cache-dir --target=/opt/python-deps numpy pyloudnorm soundfile
RUN mkdir -p /opt/audio-root && \
  for bin in /usr/bin/ffmpeg /usr/bin/ffprobe /usr/bin/sox /usr/local/bin/rnnoise_demo; do \
    cp --parents "$bin" /opt/audio-root; \
    ldd "$bin" | sed -n 's/.*=> \(\/[^ ]*\).*/\1/p; s/^\(\/[^ ]*\).*/\1/p' | sort -u | xargs -r -I '{}' cp --parents '{}' /opt/audio-root; \
  done

FROM gcr.io/distroless/python3-debian12:nonroot AS runtime
LABEL org.opencontainers.image.source="https://github.com/baditaflorin/podcast-postline" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.title="podcast-postline" \
  org.opencontainers.image.description="Podcast denoise, loudness normalization, silence trimming, and export API"

WORKDIR /app
COPY --from=go-builder /out/postline-server /app/postline-server
COPY --from=audio-builder /opt/audio-root/ /
COPY --from=audio-builder /opt/python-deps /app/python
COPY backend/scripts/process_audio.py /app/scripts/process_audio.py

ENV APP_ENV=production \
  PORT=8080 \
  PYTHON_BIN=/usr/bin/python3 \
  PYTHONPATH=/app/python \
  PIPELINE_SCRIPT=/app/scripts/process_audio.py \
  RNNOISE_DEMO=/usr/local/bin/rnnoise_demo \
  PROCESSOR_MODE=real \
  WORK_DIR=/tmp

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["/app/postline-server", "-healthcheck"]
ENTRYPOINT ["/app/postline-server"]
