package audio

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type expectedPlan struct {
	Status               string      `json:"status"`
	PlanLabel            string      `json:"plan_label"`
	OverallConfidenceMin float64     `json:"overall_confidence_min"`
	MustRecommend        PlanOptions `json:"must_recommend"`
	MustWarn             []string    `json:"must_warn"`
}

func TestRealDataFixturesInferExpectedPlans(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, fixture := range fixtures {
		t.Run(fixture.profile.ID, func(t *testing.T) {
			start := time.Now()
			plan := InferPlan(fixture.profile, -16, 750*1024*1024)
			if elapsed := time.Since(start); elapsed > 50*time.Millisecond {
				t.Fatalf("InferPlan took %s, want <50ms", elapsed)
			}

			assertPlan(t, plan, fixture.expected)
			again := InferPlan(fixture.profile, -16, 750*1024*1024)
			firstJSON := mustJSON(t, plan)
			secondJSON := mustJSON(t, again)
			if firstJSON != secondJSON {
				t.Fatalf("InferPlan is not deterministic:\nfirst=%s\nsecond=%s", firstJSON, secondJSON)
			}
		})
	}
}

func TestSyntheticEdgeProfilesDoNotCrash(t *testing.T) {
	edges := []MediaProfile{
		{ID: "edge-empty", OriginalName: "empty.wav", Format: "wav", DecodeState: "empty", SizeBytes: 0},
		{ID: "edge-huge", OriginalName: "huge.wav", Format: "wav", DecodeState: "ok", SizeBytes: 9_000_000_000, DurationSeconds: 28_800},
		{ID: "edge-truncated", OriginalName: "half-upload.mp3", Format: "mp3", DecodeState: "truncated", SizeBytes: 4096},
		{ID: "edge-unknown-format", OriginalName: "audio.bin", Format: "bin", DecodeState: "unknown", SizeBytes: 100_000},
		{ID: "edge-unicode", OriginalName: "interview_nbsp_\u00a0.wav", Format: "wav", DecodeState: "ok", SizeBytes: 256_000, Channels: 1, SampleRateHz: 48000},
	}

	for _, profile := range edges {
		t.Run(profile.ID, func(t *testing.T) {
			plan := InferPlan(profile, -16, 750*1024*1024)
			if plan.PlanID == "" {
				t.Fatal("plan id is required")
			}
			if plan.Status == "" {
				t.Fatal("status is required")
			}
		})
	}
}

func BenchmarkInferRealDataFixtures(b *testing.B) {
	fixtures := loadFixtures(b)
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		for _, fixture := range fixtures {
			_ = InferPlan(fixture.profile, -16, 750*1024*1024)
		}
	}
}

func assertPlan(t *testing.T, plan ProcessingPlan, expected expectedPlan) {
	t.Helper()
	if plan.Status != expected.Status {
		t.Fatalf("status = %q, want %q", plan.Status, expected.Status)
	}
	if plan.Label != expected.PlanLabel {
		t.Fatalf("label = %q, want %q", plan.Label, expected.PlanLabel)
	}
	if plan.Confidence < expected.OverallConfidenceMin {
		t.Fatalf("confidence = %.2f, want >= %.2f", plan.Confidence, expected.OverallConfidenceMin)
	}
	if plan.Recommended.Denoise != expected.MustRecommend.Denoise {
		t.Fatalf("denoise = %v, want %v", plan.Recommended.Denoise, expected.MustRecommend.Denoise)
	}
	if plan.Recommended.Normalize != expected.MustRecommend.Normalize {
		t.Fatalf("normalize = %v, want %v", plan.Recommended.Normalize, expected.MustRecommend.Normalize)
	}
	if plan.Recommended.TrimSilence != expected.MustRecommend.TrimSilence {
		t.Fatalf("trim_silence = %v, want %v", plan.Recommended.TrimSilence, expected.MustRecommend.TrimSilence)
	}
	if plan.Recommended.PreserveStereo != expected.MustRecommend.PreserveStereo {
		t.Fatalf("preserve_stereo = %v, want %v", plan.Recommended.PreserveStereo, expected.MustRecommend.PreserveStereo)
	}
	codes := warningCodeSet(plan)
	for _, code := range expected.MustWarn {
		if !codes[code] {
			t.Fatalf("missing warning/anomaly %q in %#v", code, codes)
		}
	}
}

func warningCodeSet(plan ProcessingPlan) map[string]bool {
	codes := map[string]bool{}
	for _, issue := range plan.Warnings {
		codes[issue.Code] = true
	}
	for _, issue := range plan.Anomalies {
		codes[issue.Code] = true
	}
	return codes
}

func mustJSON(t *testing.T, value any) string {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}

type fixturePair struct {
	profile  MediaProfile
	expected expectedPlan
}

func loadFixtures(t testing.TB) []fixturePair {
	t.Helper()
	dir := filepath.Join("..", "..", "test", "fixtures", "realdata")
	inputs, err := filepath.Glob(filepath.Join(dir, "*.input.json"))
	if err != nil {
		t.Fatal(err)
	}
	if len(inputs) != 10 {
		t.Fatalf("fixture count = %d, want 10", len(inputs))
	}

	pairs := make([]fixturePair, 0, len(inputs))
	for _, inputPath := range inputs {
		inputFile, err := os.Open(inputPath)
		if err != nil {
			t.Fatal(err)
		}
		profile, err := LoadProfileFixture(inputFile)
		_ = inputFile.Close()
		if err != nil {
			t.Fatal(err)
		}

		expectedPath := strings.TrimSuffix(inputPath, ".input.json") + ".expected.json"
		body, err := os.ReadFile(expectedPath)
		if err != nil {
			t.Fatal(err)
		}
		var expected expectedPlan
		if err := json.Unmarshal(body, &expected); err != nil {
			t.Fatal(err)
		}
		pairs = append(pairs, fixturePair{profile: profile, expected: expected})
	}
	return pairs
}
