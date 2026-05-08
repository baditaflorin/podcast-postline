package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/baditaflorin/podcast-postline/internal/audio"
	"github.com/baditaflorin/podcast-postline/internal/version"
)

type errorResponse struct {
	Error string `json:"error"`
}

type versionResponse struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Date    string `json:"date"`
}

func (s *Server) healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) readyz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) version(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, versionResponse{
		Version: version.Version,
		Commit:  version.Commit,
		Date:    version.Date,
	})
}

func (s *Server) process(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart upload")
		return
	}
	defer func() {
		if r.MultipartForm != nil {
			_ = r.MultipartForm.RemoveAll()
		}
	}()

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	options, err := parseOptions(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.validator.Struct(options); err != nil {
		writeError(w, http.StatusBadRequest, "target_lufs must be between -30 and -6; format must be mp3, wav, or m4a")
		return
	}

	inputPath, cleanup, err := saveUpload(s.cfg.WorkDir, header.Filename, file)
	if err != nil {
		s.logger.Error("save upload failed", "error", err)
		writeError(w, http.StatusInternalServerError, "could not save upload")
		return
	}
	defer cleanup()

	start := time.Now()
	result, err := s.processor.Process(r.Context(), inputPath, header.Filename, options)
	s.metrics.ObserveAudio(options.Format, time.Since(start), err == nil)
	if err != nil {
		s.logger.Error("audio processing failed", "error", err)
		writeError(w, http.StatusBadGateway, "audio processing failed")
		return
	}
	for _, path := range result.CleanupPaths {
		defer os.RemoveAll(path)
	}

	output, err := os.Open(result.Path)
	if err != nil {
		s.logger.Error("open processed audio failed", "error", err)
		writeError(w, http.StatusInternalServerError, "could not open processed audio")
		return
	}
	defer output.Close()

	stat, err := output.Stat()
	if err != nil {
		s.logger.Error("stat processed audio failed", "error", err)
		writeError(w, http.StatusInternalServerError, "could not read processed audio")
		return
	}

	filename := result.Filename
	if filename == "" {
		filename = audio.ResultFilename(header.Filename, options.Format)
	}
	contentType := result.ContentType
	if contentType == "" {
		contentType = audio.ContentType(options.Format)
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.Header().Set("X-Postline-Version", version.Version)
	http.ServeContent(w, r, filename, stat.ModTime(), output)
}

func parseOptions(r *http.Request) (audio.Options, error) {
	targetLUFS := -16.0
	if raw := strings.TrimSpace(r.FormValue("target_lufs")); raw != "" {
		value, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return audio.Options{}, errors.New("target_lufs must be numeric")
		}
		targetLUFS = value
	}

	format := strings.ToLower(strings.TrimSpace(r.FormValue("format")))
	trimSilence := true
	if raw := strings.TrimSpace(r.FormValue("trim_silence")); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			return audio.Options{}, errors.New("trim_silence must be true or false")
		}
		trimSilence = value
	}

	return audio.NormalizeOptions(audio.Options{
		TargetLUFS:  targetLUFS,
		Format:      format,
		TrimSilence: trimSilence,
	}), nil
}

func saveUpload(workDir, filename string, reader io.Reader) (string, func(), error) {
	dir, err := os.MkdirTemp(workDir, "postline-upload-*")
	if err != nil {
		return "", nil, fmt.Errorf("create upload dir: %w", err)
	}

	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".audio"
	}
	path := filepath.Join(dir, "input"+ext)
	output, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		_ = os.RemoveAll(dir)
		return "", nil, fmt.Errorf("create upload file: %w", err)
	}
	defer output.Close()

	if _, err := io.Copy(output, reader); err != nil {
		_ = os.RemoveAll(dir)
		return "", nil, fmt.Errorf("write upload file: %w", err)
	}

	return path, func() { _ = os.RemoveAll(dir) }, nil
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}
