package httpapi

import (
	"bytes"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/baditaflorin/podcast-postline/internal/audio"
	"github.com/baditaflorin/podcast-postline/internal/config"
	"github.com/baditaflorin/podcast-postline/internal/observability"
)

func TestVersionEndpoint(t *testing.T) {
	router := testRouter(t)
	request := httptest.NewRequest(http.MethodGet, "/api/version", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if !strings.Contains(response.Body.String(), `"version"`) {
		t.Fatalf("response body = %q", response.Body.String())
	}
}

func TestProcessEndpointWithStubProcessor(t *testing.T) {
	router := testRouter(t)
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	file, err := writer.CreateFormFile("file", "episode.wav")
	if err != nil {
		t.Fatalf("CreateFormFile() error = %v", err)
	}
	if _, err := io.Copy(file, strings.NewReader("fake audio")); err != nil {
		t.Fatalf("write multipart file: %v", err)
	}
	_ = writer.WriteField("format", "mp3")
	_ = writer.WriteField("target_lufs", "-16")
	_ = writer.WriteField("trim_silence", "true")
	if err := writer.Close(); err != nil {
		t.Fatalf("writer.Close() error = %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/process", body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}
	if got := response.Header().Get("Content-Disposition"); !strings.Contains(got, "episode-postline.mp3") {
		t.Fatalf("Content-Disposition = %q", got)
	}
}

func testRouter(t *testing.T) http.Handler {
	t.Helper()
	tmp := t.TempDir()
	cfg := config.Config{
		Port:           "8080",
		AllowedOrigins: []string{"http://localhost:5173"},
		MaxUploadBytes: 10 << 20,
		ProcessorMode:  "stub",
		WorkDir:        tmp,
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewRouter(cfg, audio.StubProcessor{WorkDir: tmp}, observability.NewMetrics(), logger)
}
