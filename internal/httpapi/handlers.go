// Package httpapi exposes the HTTP API for processing uploaded audio.
package httpapi

import (
	"encoding/base64"
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
	Error       string `json:"error"`
	Code        string `json:"code,omitempty"`
	What        string `json:"what,omitempty"`
	Why         string `json:"why,omitempty"`
	Next        string `json:"next,omitempty"`
	Recoverable bool   `json:"recoverable"`
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

func (s *Server) preflight(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "invalid_upload",
			What:        "Upload was not readable",
			Why:         "The request was not a valid multipart audio upload.",
			Next:        "Choose one audio file and try again.",
			Recoverable: true,
		})
		return
	}
	defer removeMultipart(r)

	file, header, err := r.FormFile("file")
	if err != nil {
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "missing_file",
			What:        "No recording was uploaded",
			Why:         "The request did not include a file field.",
			Next:        "Choose a WAV, MP3, M4A, or FLAC recording.",
			Recoverable: true,
		})
		return
	}
	defer func() { _ = file.Close() }()

	inputPath, cleanup, err := saveUpload(s.cfg.WorkDir, header.Filename, file)
	if err != nil {
		s.logger.Error("save preflight upload failed", "error", err)
		writeDomainError(w, http.StatusInternalServerError, audio.DomainError{
			Code:        "upload_save_failed",
			What:        "Could not stage the recording",
			Why:         "The backend could not write the upload to temporary storage.",
			Next:        "Try again or check server disk space.",
			Recoverable: true,
		})
		return
	}
	defer cleanup()

	profile, err := s.analyzer.Analyze(r.Context(), inputPath, header.Filename)
	if err != nil {
		s.logger.Error("preflight analyze failed", "error", err)
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "preflight_failed",
			What:        "Could not inspect the recording",
			Why:         "The backend could not read enough media facts to make a safe first guess.",
			Next:        "Try exporting the recording again as WAV or MP3.",
			Recoverable: true,
		})
		return
	}

	target := -16.0
	if raw := strings.TrimSpace(r.FormValue("target_lufs")); raw != "" {
		value, err := strconv.ParseFloat(raw, 64)
		if err == nil {
			target = value
		}
	}
	plan := audio.InferPlan(profile, target, s.cfg.MaxUploadBytes)
	writeJSON(w, http.StatusOK, plan)
}

func (s *Server) process(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "invalid_upload",
			What:        "Upload was not readable",
			Why:         "The request was not a valid multipart audio upload.",
			Next:        "Choose one audio file and try again.",
			Recoverable: true,
		})
		return
	}
	defer removeMultipart(r)

	file, header, err := r.FormFile("file")
	if err != nil {
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "missing_file",
			What:        "No recording was uploaded",
			Why:         "The request did not include a file field.",
			Next:        "Choose a WAV, MP3, M4A, or FLAC recording.",
			Recoverable: true,
		})
		return
	}
	defer func() { _ = file.Close() }()

	inputPath, cleanup, err := saveUpload(s.cfg.WorkDir, header.Filename, file)
	if err != nil {
		s.logger.Error("save upload failed", "error", err)
		writeDomainError(w, http.StatusInternalServerError, audio.DomainError{
			Code:        "upload_save_failed",
			What:        "Could not stage the recording",
			Why:         "The backend could not write the upload to temporary storage.",
			Next:        "Try again or check server disk space.",
			Recoverable: true,
		})
		return
	}
	defer cleanup()

	profile, err := s.analyzer.Analyze(r.Context(), inputPath, header.Filename)
	if err != nil {
		s.logger.Error("process analyze failed", "error", err)
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "preflight_failed",
			What:        "Could not inspect the recording",
			Why:         "The backend could not read enough media facts to make a safe processing plan.",
			Next:        "Try exporting the recording again as WAV or MP3.",
			Recoverable: true,
		})
		return
	}
	basePlan := audio.InferPlan(profile, -16, s.cfg.MaxUploadBytes)
	if basePlan.Status == audio.StatusBlocked {
		writeDomainError(w, http.StatusUnprocessableEntity, audio.BlockedError(basePlan))
		return
	}

	options, err := parseOptions(r, &basePlan)
	if err != nil {
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "invalid_options",
			What:        "Processing settings are invalid",
			Why:         err.Error(),
			Next:        "Use the recommended settings or choose a target between -30 and -6 LUFS.",
			Recoverable: true,
		})
		return
	}
	if err := s.validator.Struct(options); err != nil {
		writeDomainError(w, http.StatusBadRequest, audio.DomainError{
			Code:        "invalid_options",
			What:        "Processing settings are invalid",
			Why:         "Target LUFS must be between -30 and -6; format must be mp3, wav, or m4a.",
			Next:        "Use the recommended settings and try again.",
			Recoverable: true,
		})
		return
	}
	plan := audio.InferPlan(profile, options.TargetLUFS, s.cfg.MaxUploadBytes)

	start := time.Now()
	result, err := s.processor.Process(r.Context(), inputPath, header.Filename, options)
	s.metrics.ObserveAudio(options.Format, time.Since(start), err == nil)
	if err != nil {
		s.logger.Error("audio processing failed", "error", err)
		writeDomainError(w, http.StatusBadGateway, audio.DomainError{
			Code:        "processing_failed",
			What:        "Audio processing failed",
			Why:         classifyProcessingFailure(err.Error()),
			Next:        "Try the recommended plan, disable risky steps, or export the source as WAV.",
			Recoverable: true,
		})
		return
	}
	for _, path := range result.CleanupPaths {
		defer func(path string) { _ = os.RemoveAll(path) }(path)
	}

	output, err := os.Open(result.Path)
	if err != nil {
		s.logger.Error("open processed audio failed", "error", err)
		writeDomainError(w, http.StatusInternalServerError, audio.DomainError{
			Code:        "export_missing",
			What:        "Processed export is missing",
			Why:         "The pipeline finished but the exported audio file was not found.",
			Next:        "Retry processing; if it repeats, check backend logs.",
			Recoverable: true,
		})
		return
	}
	defer func() { _ = output.Close() }()

	stat, err := output.Stat()
	if err != nil {
		s.logger.Error("stat processed audio failed", "error", err)
		writeDomainError(w, http.StatusInternalServerError, audio.DomainError{
			Code:        "export_unreadable",
			What:        "Processed export is unreadable",
			Why:         "The backend could not read the finished audio file.",
			Next:        "Retry processing; if it repeats, check backend storage.",
			Recoverable: true,
		})
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
	setProvenanceHeaders(w, provenancePayload{
		SchemaVersion: "phase2.provenance.v1",
		AppVersion:    version.Version,
		Commit:        version.Commit,
		Profile:       plan.Profile,
		PlanID:        plan.PlanID,
		Confidence:    plan.Confidence,
		Options:       options,
		Warnings:      plan.Warnings,
		Anomalies:     plan.Anomalies,
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
	})
	http.ServeContent(w, r, filename, stat.ModTime(), output)
}

type provenancePayload struct {
	SchemaVersion string             `json:"schema_version"`
	AppVersion    string             `json:"app_version"`
	Commit        string             `json:"commit"`
	Profile       audio.MediaProfile `json:"profile"`
	PlanID        string             `json:"plan_id"`
	Confidence    float64            `json:"confidence"`
	Options       audio.Options      `json:"options"`
	Warnings      []audio.Issue      `json:"warnings"`
	Anomalies     []audio.Issue      `json:"anomalies"`
	GeneratedAt   string             `json:"generated_at"`
}

func parseOptions(r *http.Request, plan *audio.ProcessingPlan) (audio.Options, error) {
	targetLUFS := -16.0
	format := "mp3"
	trimSilence := true
	denoise := true
	normalize := true
	preserveStereo := false
	if plan != nil {
		targetLUFS = plan.Recommended.TargetLUFS
		format = plan.Recommended.Format
		trimSilence = plan.Recommended.TrimSilence
		denoise = plan.Recommended.Denoise
		normalize = plan.Recommended.Normalize
		preserveStereo = plan.Recommended.PreserveStereo
	}
	if raw := strings.TrimSpace(r.FormValue("target_lufs")); raw != "" {
		value, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return audio.Options{}, errors.New("target_lufs must be numeric")
		}
		targetLUFS = value
	}

	if raw := strings.ToLower(strings.TrimSpace(r.FormValue("format"))); raw != "" {
		format = raw
	}
	if raw := strings.TrimSpace(r.FormValue("trim_silence")); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			return audio.Options{}, errors.New("trim_silence must be true or false")
		}
		trimSilence = value
	}
	if raw := strings.TrimSpace(r.FormValue("denoise")); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			return audio.Options{}, errors.New("denoise must be true or false")
		}
		denoise = value
	}
	if raw := strings.TrimSpace(r.FormValue("normalize")); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			return audio.Options{}, errors.New("normalize must be true or false")
		}
		normalize = value
	}
	if raw := strings.TrimSpace(r.FormValue("preserve_stereo")); raw != "" {
		value, err := strconv.ParseBool(raw)
		if err != nil {
			return audio.Options{}, errors.New("preserve_stereo must be true or false")
		}
		preserveStereo = value
	}

	return audio.NormalizeOptions(audio.Options{
		TargetLUFS:     targetLUFS,
		Format:         format,
		TrimSilence:    trimSilence,
		Denoise:        denoise,
		Normalize:      normalize,
		PreserveStereo: preserveStereo,
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
	// #nosec G304,G703 -- path is constructed inside a fresh private temp directory.
	output, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		_ = os.RemoveAll(dir)
		return "", nil, fmt.Errorf("create upload file: %w", err)
	}
	defer func() { _ = output.Close() }()

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
	writeJSON(w, status, errorResponse{Error: message, What: message, Recoverable: true})
}

func writeDomainError(w http.ResponseWriter, status int, err audio.DomainError) {
	writeJSON(w, status, errorResponse{
		Error:       err.What,
		Code:        err.Code,
		What:        err.What,
		Why:         err.Why,
		Next:        err.Next,
		Recoverable: err.Recoverable,
	})
}

func removeMultipart(r *http.Request) {
	if r.MultipartForm != nil {
		_ = r.MultipartForm.RemoveAll()
	}
}

func setProvenanceHeaders(w http.ResponseWriter, payload provenancePayload) {
	body, err := json.Marshal(payload)
	if err != nil {
		return
	}
	w.Header().Set("X-Postline-Provenance", base64.RawURLEncoding.EncodeToString(body))
	w.Header().Set("X-Postline-Confidence", strconv.FormatFloat(payload.Confidence, 'f', 2, 64))
	w.Header().Set("X-Postline-Plan", payload.PlanID)
	warningCodes := make([]string, 0, len(payload.Warnings)+len(payload.Anomalies))
	for _, issue := range payload.Warnings {
		warningCodes = append(warningCodes, issue.Code)
	}
	for _, issue := range payload.Anomalies {
		warningCodes = append(warningCodes, issue.Code)
	}
	w.Header().Set("X-Postline-Warnings", strings.Join(warningCodes, ","))
}

func classifyProcessingFailure(message string) string {
	lower := strings.ToLower(message)
	switch {
	case strings.Contains(lower, "rnnoise") && strings.Contains(lower, "mono"):
		return "RNNoise denoise currently requires mono speech, but the plan preserved stereo."
	case strings.Contains(lower, "invalid data") || strings.Contains(lower, "could not find codec"):
		return "The media decoder could not read this recording."
	case strings.Contains(lower, "loudness"):
		return "The loudness meter could not measure usable speech."
	default:
		return "The native audio pipeline could not finish this recording."
	}
}
