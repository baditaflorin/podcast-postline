package audio

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

const (
	// SchemaVersion identifies the media profile and plan contract returned by preflight.
	SchemaVersion = "phase2.media-profile.v1"
	// StatusReady means the inferred plan can run without user review.
	StatusReady = "ready"
	// StatusReview means the inferred plan is usable but should be checked first.
	StatusReview = "needs_review"
	// StatusBlocked means the input should not be processed.
	StatusBlocked = "blocked"
)

// MediaProfile contains normalized facts about one uploaded recording.
type MediaProfile struct {
	ID                string  `json:"id,omitempty"`
	OriginalName      string  `json:"original_name"`
	SizeBytes         int64   `json:"size_bytes"`
	Format            string  `json:"format"`
	MIME              string  `json:"mime"`
	DurationSeconds   float64 `json:"duration_seconds"`
	Channels          int     `json:"channels"`
	SampleRateHz      int     `json:"sample_rate_hz"`
	BitDepth          int     `json:"bit_depth"`
	IntegratedLUFS    float64 `json:"integrated_lufs"`
	PeakDBFS          float64 `json:"peak_dbfs"`
	NoiseFloorDBFS    float64 `json:"noise_floor_dbfs"`
	SilenceRatio      float64 `json:"silence_ratio"`
	SpeechRatio       float64 `json:"speech_ratio"`
	MusicRatio        float64 `json:"music_ratio"`
	DCOffset          float64 `json:"dc_offset,omitempty"`
	DecodeState       string  `json:"decode_state"`
	FingerprintSHA256 string  `json:"fingerprint_sha256,omitempty"`
	Notes             string  `json:"notes,omitempty"`
}

// PlanOptions are the processing knobs inferred from a media profile.
type PlanOptions struct {
	TargetLUFS     float64 `json:"target_lufs"`
	Format         string  `json:"format"`
	TrimSilence    bool    `json:"trim_silence"`
	Denoise        bool    `json:"denoise"`
	Normalize      bool    `json:"normalize"`
	PreserveStereo bool    `json:"preserve_stereo"`
}

// Issue describes a warning, anomaly, or blocker in audio terms.
type Issue struct {
	Code       string  `json:"code"`
	Severity   string  `json:"severity"`
	Message    string  `json:"message"`
	Why        string  `json:"why"`
	Next       string  `json:"next"`
	Confidence float64 `json:"confidence"`
}

// ProcessingPlan is the deterministic first guess the app makes for a recording.
type ProcessingPlan struct {
	SchemaVersion string       `json:"schema_version"`
	PlanID        string       `json:"plan_id"`
	Status        string       `json:"status"`
	Label         string       `json:"label"`
	Confidence    float64      `json:"confidence"`
	Profile       MediaProfile `json:"profile"`
	Recommended   PlanOptions  `json:"recommended"`
	Warnings      []Issue      `json:"warnings"`
	Anomalies     []Issue      `json:"anomalies"`
	Reasons       []string     `json:"reasons"`
}

// Analyzer inspects an uploaded recording before processing.
type Analyzer interface {
	Analyze(ctx context.Context, inputPath string, originalName string) (MediaProfile, error)
}

// FileAnalyzer performs deterministic lightweight preflight from the uploaded file.
type FileAnalyzer struct {
	MaxUploadBytes int64
}

// Analyze extracts stable file facts without invoking the destructive pipeline.
func (a FileAnalyzer) Analyze(ctx context.Context, inputPath string, originalName string) (MediaProfile, error) {
	stat, err := os.Stat(inputPath)
	if err != nil {
		return MediaProfile{}, fmt.Errorf("stat upload: %w", err)
	}

	profile := MediaProfile{
		OriginalName: originalName,
		SizeBytes:    stat.Size(),
		Format:       strings.TrimPrefix(strings.ToLower(filepath.Ext(originalName)), "."),
		MIME:         mimeFromName(originalName),
		DecodeState:  "unknown",
	}

	fingerprint, err := sha256File(inputPath)
	if err != nil {
		return MediaProfile{}, err
	}
	profile.FingerprintSHA256 = fingerprint
	if len(fingerprint) >= 12 {
		profile.ID = "sha256-" + fingerprint[:12]
	}

	if profile.SizeBytes == 0 {
		profile.DecodeState = "empty"
		return profile, nil
	}

	if probed, ok := probeWithFFprobe(ctx, inputPath); ok {
		mergeProbe(&profile, probed)
	}

	if profile.Format == "wav" {
		wav, err := parseWAV(inputPath)
		if err != nil {
			profile.DecodeState = "truncated"
			return profile, nil
		}
		profile.DecodeState = "ok"
		profile.DurationSeconds = wav.DurationSeconds
		profile.Channels = wav.Channels
		profile.SampleRateHz = wav.SampleRateHz
		profile.BitDepth = wav.BitDepth
		profile.PeakDBFS = wav.PeakDBFS
		profile.SilenceRatio = wav.SilenceRatio
		profile.DCOffset = wav.DCOffset
		return profile, nil
	}

	if looksTruncated(profile) {
		profile.DecodeState = "truncated"
		return profile, nil
	}

	if profile.Format == "mp3" || profile.Format == "m4a" || profile.Format == "flac" {
		profile.DecodeState = "ok"
	}

	return profile, nil
}

type ffprobeResult struct {
	Format struct {
		Duration string `json:"duration"`
		Size     string `json:"size"`
	} `json:"format"`
	Streams []struct {
		CodecType        string `json:"codec_type"`
		Channels         int    `json:"channels"`
		SampleRate       string `json:"sample_rate"`
		BitsPerSample    int    `json:"bits_per_sample"`
		BitsPerRawSample string `json:"bits_per_raw_sample"`
	} `json:"streams"`
}

func probeWithFFprobe(ctx context.Context, inputPath string) (MediaProfile, bool) {
	binary, err := exec.LookPath("ffprobe")
	if err != nil {
		return MediaProfile{}, false
	}
	// #nosec G204 -- ffprobe is a fixed local binary resolved from PATH; only the staged upload path varies.
	cmd := exec.CommandContext(
		ctx,
		binary,
		"-v",
		"error",
		"-print_format",
		"json",
		"-show_format",
		"-show_streams",
		inputPath,
	)
	output, err := cmd.Output()
	if err != nil {
		return MediaProfile{}, false
	}
	var result ffprobeResult
	if err := json.Unmarshal(output, &result); err != nil {
		return MediaProfile{}, false
	}

	profile := MediaProfile{DecodeState: "ok"}
	if duration, err := strconv.ParseFloat(result.Format.Duration, 64); err == nil {
		profile.DurationSeconds = duration
	}
	if size, err := strconv.ParseInt(result.Format.Size, 10, 64); err == nil {
		profile.SizeBytes = size
	}
	for _, stream := range result.Streams {
		if stream.CodecType != "audio" {
			continue
		}
		profile.Channels = stream.Channels
		if sampleRate, err := strconv.Atoi(stream.SampleRate); err == nil {
			profile.SampleRateHz = sampleRate
		}
		profile.BitDepth = stream.BitsPerSample
		if profile.BitDepth == 0 {
			if raw, err := strconv.Atoi(stream.BitsPerRawSample); err == nil {
				profile.BitDepth = raw
			}
		}
		break
	}
	return profile, profile.DurationSeconds > 0 || profile.Channels > 0 || profile.SampleRateHz > 0
}

func mergeProbe(profile *MediaProfile, probed MediaProfile) {
	if probed.DecodeState != "" {
		profile.DecodeState = probed.DecodeState
	}
	if probed.SizeBytes > 0 {
		profile.SizeBytes = probed.SizeBytes
	}
	if probed.DurationSeconds > 0 {
		profile.DurationSeconds = probed.DurationSeconds
	}
	if probed.Channels > 0 {
		profile.Channels = probed.Channels
	}
	if probed.SampleRateHz > 0 {
		profile.SampleRateHz = probed.SampleRateHz
	}
	if probed.BitDepth > 0 {
		profile.BitDepth = probed.BitDepth
	}
}

// InferPlan turns normalized media facts into a safe processing recommendation.
//
//nolint:gocyclo // Audio safety rules stay linear so every warning remains explainable and ordered.
func InferPlan(profile MediaProfile, targetLUFS float64, maxUploadBytes int64) ProcessingPlan {
	if targetLUFS == 0 {
		targetLUFS = -16
	}

	plan := ProcessingPlan{
		SchemaVersion: SchemaVersion,
		Status:        StatusReady,
		Label:         "Normalize clean speech",
		Confidence:    0.9,
		Profile:       normalizeProfile(profile),
		Recommended: PlanOptions{
			TargetLUFS:     targetLUFS,
			Format:         defaultFormat(profile.Format),
			TrimSilence:    true,
			Denoise:        true,
			Normalize:      true,
			PreserveStereo: profile.Channels > 1,
		},
		Reasons: []string{"Default podcast target is -16 LUFS."},
	}

	if profile.SizeBytes <= 0 || profile.DecodeState == "empty" {
		block(&plan, "silent_recording", "Silent or empty recording", "The uploaded file has no usable audio bytes.", "Choose the original recording or export it again.", 0.96)
	}
	if profile.DecodeState == "truncated" {
		block(&plan, "truncated_media", "Unreadable or truncated media", "The file looks like an incomplete transfer or damaged export.", "Re-upload the full file or export a fresh copy from the recorder.", 0.95)
	}
	if maxUploadBytes > 0 && profile.SizeBytes > maxUploadBytes {
		block(&plan, "too_large", "Too large for this backend", "The file is larger than this backend's upload budget.", "Use a compressed source file or increase MAX_UPLOAD_MB on the server.", 0.98)
		plan.Recommended.PreserveStereo = profile.Channels > 1
	}
	if profile.SilenceRatio >= 0.95 || (profile.PeakDBFS != 0 && profile.PeakDBFS <= -55) {
		block(&plan, "silent_recording", "Silent or unusable recording", "The waveform is almost entirely silence.", "Check the microphone/source track and upload a take with speech.", 0.94)
	}

	if profile.DurationSeconds >= 10_800 {
		warn(&plan, "very_long_recording", "Very long recording", "This recording is several hours long and may exceed runtime limits.", "Use a shorter episode segment or process on a larger server.", 0.9)
	}
	if profile.DurationSeconds >= 5_400 {
		if plan.Status != StatusBlocked {
			plan.Label = "Long episode with pauses"
		}
		warn(&plan, "long_running_job", "Long episode", "This will take noticeably longer than a normal episode.", "Keep this tab open; you can cancel if needed.", 0.86)
	}
	if profile.SilenceRatio >= 0.2 && plan.Status != StatusBlocked {
		warn(&plan, "many_pauses", "Many long pauses", "The recording contains more silence than a typical edited episode.", "Review trim behavior before publishing.", 0.78)
	}
	if profile.Channels > 1 && plan.Status != StatusBlocked {
		if profile.DurationSeconds < 5_400 {
			plan.Label = "Preserve stereo speech"
		}
		plan.Recommended.PreserveStereo = true
		plan.Recommended.Denoise = false
		warn(&plan, "stereo_preserved", "Stereo speech detected", "The recording has multiple channels, likely split speakers or stereo ambience.", "Preserve stereo unless you intentionally want a mono master.", 0.82)
		warn(&plan, "denoise_skipped_for_stereo", "RNNoise skipped for stereo", "The RNNoise demo path is safest for mono speech; denoising stereo can collapse the image.", "Keep denoise off or convert to mono deliberately.", 0.78)
	}
	if profile.IntegratedLUFS != 0 && math.Abs(profile.IntegratedLUFS-targetLUFS) <= 0.5 && profile.PeakDBFS <= -1.0 && profile.NoiseFloorDBFS <= -55 {
		plan.Label = "Already near podcast loudness"
		plan.Recommended.Normalize = false
		plan.Recommended.Denoise = false
		plan.Recommended.TrimSilence = false
		warn(&plan, "already_compliant", "Already near -16 LUFS", "This file appears already mastered for podcast loudness.", "Use minimal processing unless you hear a specific problem.", 0.92)
		plan.Status = StatusReady
		plan.Confidence = 0.9
	}
	if profile.IntegratedLUFS != 0 && targetLUFS-profile.IntegratedLUFS >= 8 && plan.Status != StatusBlocked {
		plan.Label = "Recover quiet noisy speech"
		warn(&plan, "large_gain", "Large loudness lift needed", "The recording is much quieter than the podcast target.", "Listen for amplified background noise after processing.", 0.84)
	}
	if profile.NoiseFloorDBFS != 0 && profile.NoiseFloorDBFS > -48 && plan.Status != StatusBlocked {
		warn(&plan, "high_noise_floor", "High background noise", "Room tone or machine noise is close to speech level.", "Use denoise, then verify speech does not sound watery.", 0.8)
		plan.Recommended.Denoise = true
	}
	if profile.MusicRatio >= 0.18 && plan.Status != StatusBlocked {
		plan.Label = "Protect mixed music and speech"
		plan.Recommended.Denoise = false
		plan.Recommended.TrimSilence = false
		warn(&plan, "mixed_music_speech", "Music or ambience detected", "The file appears to contain intentional non-speech audio.", "Review before denoising or trimming; those steps can damage intros/outros.", 0.68)
		warn(&plan, "trim_disabled_for_intro", "Trim disabled for likely intro/outro", "Silence trimming can remove intentional breathing room around music.", "Trim manually after listening if needed.", 0.66)
		warn(&plan, "denoise_low_confidence", "Denoise confidence is low", "RNNoise is trained for speech and can damage music/ambience.", "Leave denoise off unless the speech section needs repair.", 0.62)
	}
	if profile.SampleRateHz > 0 && profile.SampleRateHz < 32000 {
		plan.Label = "Legacy archive repair"
		warn(&plan, "legacy_format", "Legacy sample rate", "This recording uses a low sample rate by modern podcast standards.", "Expect resampling and check speech clarity.", 0.86)
	}
	if profile.BitDepth > 0 && profile.BitDepth < 16 {
		plan.Label = "Legacy archive repair"
		warn(&plan, "legacy_format", "Legacy bit depth", "This recording has low bit depth and may contain quantization noise.", "Use a higher-quality source if available.", 0.86)
	}
	if profile.PeakDBFS > -0.5 {
		warn(&plan, "near_clipping", "Possible clipping", "The signal peaks very close to 0 dBFS.", "Listen for distortion; normalization cannot repair clipped speech.", 0.88)
	}
	if math.Abs(profile.DCOffset) >= 0.08 {
		warn(&plan, "dc_offset", "DC offset detected", "The waveform appears shifted away from center.", "The pipeline should repair level, but verify old archive audio carefully.", 0.8)
	}

	sortIssues(plan.Warnings)
	sortIssues(plan.Anomalies)
	plan.Confidence = clampConfidence(plan.Confidence)
	plan.PlanID = planID(plan)
	return plan
}

func normalizeProfile(profile MediaProfile) MediaProfile {
	profile.Format = strings.ToLower(strings.TrimSpace(profile.Format))
	profile.MIME = strings.TrimSpace(profile.MIME)
	if profile.DecodeState == "" {
		profile.DecodeState = "unknown"
	}
	return profile
}

func block(plan *ProcessingPlan, code, message, why, next string, confidence float64) {
	plan.Status = StatusBlocked
	plan.Label = message
	plan.Recommended.Denoise = false
	plan.Recommended.Normalize = false
	plan.Recommended.TrimSilence = false
	plan.Confidence = math.Max(plan.Confidence, confidence)
	plan.Anomalies = append(plan.Anomalies, Issue{Code: code, Severity: "blocker", Message: message, Why: why, Next: next, Confidence: confidence})
}

func warn(plan *ProcessingPlan, code, message, why, next string, confidence float64) {
	if plan.Status == StatusReady {
		plan.Status = StatusReview
	}
	if plan.Status != StatusBlocked {
		penalty := (1 - confidence) * 0.18
		plan.Confidence -= penalty
	}
	plan.Warnings = append(plan.Warnings, Issue{Code: code, Severity: "warning", Message: message, Why: why, Next: next, Confidence: confidence})
	plan.Reasons = append(plan.Reasons, why)
}

func planID(plan ProcessingPlan) string {
	codes := make([]string, 0, len(plan.Warnings)+len(plan.Anomalies))
	for _, issue := range plan.Warnings {
		codes = append(codes, issue.Code)
	}
	for _, issue := range plan.Anomalies {
		codes = append(codes, issue.Code)
	}
	sort.Strings(codes)
	sourceID := plan.Profile.ID
	if sourceID == "" {
		sourceID = plan.Profile.FingerprintSHA256
	}
	input := strings.Join([]string{sourceID, plan.Profile.OriginalName, plan.Status, plan.Label, strings.Join(codes, ",")}, "|")
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])[:12]
}

func sortIssues(issues []Issue) {
	sort.SliceStable(issues, func(i, j int) bool {
		if issues[i].Severity == issues[j].Severity {
			return issues[i].Code < issues[j].Code
		}
		return issues[i].Severity < issues[j].Severity
	})
}

func clampConfidence(value float64) float64 {
	if value < 0.35 {
		return 0.35
	}
	if value > 0.99 {
		return 0.99
	}
	return math.Round(value*100) / 100
}

func defaultFormat(format string) string {
	switch strings.ToLower(format) {
	case "wav":
		return "wav"
	case "m4a":
		return "m4a"
	default:
		return "mp3"
	}
}

func mimeFromName(name string) string {
	return ContentType(strings.TrimPrefix(strings.ToLower(filepath.Ext(name)), "."))
}

func sha256File(path string) (string, error) {
	// #nosec G304 -- path is a staged upload or fixture path owned by the caller.
	file, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open upload for fingerprint: %w", err)
	}
	defer func() { _ = file.Close() }()
	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", fmt.Errorf("fingerprint upload: %w", err)
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func looksTruncated(profile MediaProfile) bool {
	if profile.SizeBytes < 128_000 && (profile.Format == "mp3" || profile.Format == "m4a" || profile.Format == "flac") {
		return true
	}
	return false
}

// LoadProfileFixture decodes a real-data profile fixture for tests.
func LoadProfileFixture(reader io.Reader) (MediaProfile, error) {
	var profile MediaProfile
	if err := json.NewDecoder(reader).Decode(&profile); err != nil {
		return MediaProfile{}, err
	}
	if strings.TrimSpace(profile.ID) == "" {
		return MediaProfile{}, errors.New("fixture id is required")
	}
	return profile, nil
}
