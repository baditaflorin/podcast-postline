SHELL := /bin/sh

APP_NAME := podcast-postline
VERSION ?= 0.2.0
GIT_COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
CREATED ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
PAGES_URL := https://baditaflorin.github.io/podcast-postline/
REPO_URL := https://github.com/baditaflorin/podcast-postline
PAYPAL_URL := https://www.paypal.com/paypalme/florinbadita
API_BASE_URL ?= http://localhost:8080
BUILDER ?=
BUILDER_FLAG := $(if $(BUILDER),--builder $(BUILDER),)

.PHONY: help install-hooks dev build data test test-integration smoke lint fmt pages-preview docker-build docker-push release compose-up compose-down clean hooks-pre-commit hooks-commit-msg hooks-pre-push

help:
	@printf '%s\n' \
		'make install-hooks     wire .githooks' \
		'make dev               run backend stub + frontend dev server' \
		'make build             build backend and Pages frontend into docs/' \
		'make data              no-op for Mode C' \
		'make test              run Go and frontend unit tests' \
		'make test-integration  run integration tests' \
		'make smoke             run local smoke tests' \
		'make lint              run linters and type checks' \
		'make fmt               format Go and frontend files' \
		'make pages-preview     preview docs/ as GitHub Pages' \
		'make docker-build      build linux/amd64 image' \
		'make docker-push       push image tags to GHCR' \
		'make release           tag release and build image' \
		'make compose-up        start local compose stack' \
		'make compose-down      stop local compose stack' \
		'make clean             remove local generated outputs'

install-hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/*

dev:
	@mkdir -p tmp
	PROCESSOR_MODE=stub PORT=8080 CGO_ENABLED=0 go run ./cmd/server > tmp/dev-server.log 2>&1 & \
	echo $$! > tmp/dev-server.pid; \
	npm run dev

build:
	rm -rf docs/assets docs/index.html docs/404.html docs/manifest.webmanifest docs/sw.js
	VITE_APP_VERSION=$(VERSION) \
	VITE_GIT_COMMIT=$(GIT_COMMIT) \
	VITE_API_BASE_URL=$(API_BASE_URL) \
	VITE_REPO_URL=$(REPO_URL) \
	VITE_PAYPAL_URL=$(PAYPAL_URL) \
	npm run build
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X github.com/baditaflorin/podcast-postline/internal/version.Version=$(VERSION) -X github.com/baditaflorin/podcast-postline/internal/version.Commit=$(GIT_COMMIT) -X github.com/baditaflorin/podcast-postline/internal/version.Date=$(CREATED)" -o bin/postline-server ./cmd/server
	test -s docs/index.html
	test -s docs/404.html

data:
	@echo "Mode C uses runtime uploads; no static data artifacts are generated."

test:
	CGO_ENABLED=0 go test ./cmd/... ./internal/...
	npm test

test-integration:
	@echo "No integration suite is enabled by default. Use Docker to exercise the real audio toolchain."

smoke:
	scripts/smoke.sh

lint:
	gofmt -w cmd internal
	CGO_ENABLED=0 go vet ./cmd/... ./internal/...
	npm run typecheck
	npm run lint
	npm run fmt:check
	@if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run ./cmd/... ./internal/...; else echo "golangci-lint not installed; skipping"; fi
	@if command -v govulncheck >/dev/null 2>&1; then CGO_ENABLED=0 govulncheck ./cmd/... ./internal/...; else echo "govulncheck not installed; skipping"; fi
	npm audit --audit-level=high

fmt:
	gofmt -w cmd internal
	npm run fmt

pages-preview:
	npx vite preview --host 127.0.0.1 --port 4173

docker-build:
	docker buildx build $(BUILDER_FLAG) --platform linux/amd64 --load \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT=$(GIT_COMMIT) \
		--build-arg CREATED=$(CREATED) \
		-t ghcr.io/baditaflorin/$(APP_NAME):latest \
		-t ghcr.io/baditaflorin/$(APP_NAME):v$(VERSION) \
		-t ghcr.io/baditaflorin/$(APP_NAME):$(GIT_COMMIT) \
		.

docker-push:
	docker buildx build $(BUILDER_FLAG) --platform linux/amd64 --push \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT=$(GIT_COMMIT) \
		--build-arg CREATED=$(CREATED) \
		-t ghcr.io/baditaflorin/$(APP_NAME):latest \
		-t ghcr.io/baditaflorin/$(APP_NAME):v$(VERSION) \
		-t ghcr.io/baditaflorin/$(APP_NAME):$(GIT_COMMIT) \
		.

release:
	git tag v$(VERSION)
	git push origin v$(VERSION)
	$(MAKE) docker-push VERSION=$(VERSION)

compose-up:
	docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml up -d --build

compose-down:
	docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml down

clean:
	rm -rf bin tmp coverage playwright-report test-results

hooks-pre-commit:
	.githooks/pre-commit

hooks-commit-msg:
	.githooks/commit-msg .git/COMMIT_EDITMSG

hooks-pre-push:
	.githooks/pre-push
