// Package config loads backend runtime configuration from environment variables.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config contains all runtime settings for the API server.
type Config struct {
	AppEnv          string
	Port            string
	AllowedOrigins  []string
	MaxUploadBytes  int64
	ProcessorMode   string
	PythonBin       string
	PipelineScript  string
	RNNoiseDemo     string
	WorkDir         string
	ShutdownTimeout time.Duration
}

// Load reads environment variables, applies defaults, and validates the result.
func Load() (Config, error) {
	maxUploadMB, err := intEnv("MAX_UPLOAD_MB", 750)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		AppEnv:          stringEnv("APP_ENV", "development"),
		Port:            stringEnv("PORT", "8080"),
		AllowedOrigins:  csvEnv("ALLOWED_ORIGINS", "http://localhost:5173,https://baditaflorin.github.io"),
		MaxUploadBytes:  int64(maxUploadMB) * 1024 * 1024,
		ProcessorMode:   stringEnv("PROCESSOR_MODE", "real"),
		PythonBin:       stringEnv("PYTHON_BIN", "python3"),
		PipelineScript:  stringEnv("PIPELINE_SCRIPT", "backend/scripts/process_audio.py"),
		RNNoiseDemo:     stringEnv("RNNOISE_DEMO", "rnnoise_demo"),
		WorkDir:         stringEnv("WORK_DIR", os.TempDir()),
		ShutdownTimeout: 15 * time.Second,
	}

	if cfg.Port == "" {
		return Config{}, fmt.Errorf("PORT cannot be empty")
	}
	if cfg.MaxUploadBytes <= 0 {
		return Config{}, fmt.Errorf("MAX_UPLOAD_MB must be positive")
	}
	if cfg.ProcessorMode != "real" && cfg.ProcessorMode != "stub" {
		return Config{}, fmt.Errorf("PROCESSOR_MODE must be real or stub")
	}

	return cfg, nil
}

func stringEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func csvEnv(key, fallback string) []string {
	raw := stringEnv(key, fallback)
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			values = append(values, value)
		}
	}
	return values
}

func intEnv(key string, fallback int) (int, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	return value, nil
}
