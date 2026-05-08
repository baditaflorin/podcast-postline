package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("MAX_UPLOAD_MB", "")
	t.Setenv("PROCESSOR_MODE", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.Port != "8080" {
		t.Fatalf("Port = %q, want 8080", cfg.Port)
	}
	if cfg.MaxUploadBytes != 750*1024*1024 {
		t.Fatalf("MaxUploadBytes = %d", cfg.MaxUploadBytes)
	}
}

func TestLoadRejectsBadProcessorMode(t *testing.T) {
	t.Setenv("PROCESSOR_MODE", "mystery")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want validation error")
	}
}
