package audio

import "testing"

func TestNormalizeOptions(t *testing.T) {
	got := NormalizeOptions(Options{})

	if got.TargetLUFS != -16 {
		t.Fatalf("TargetLUFS = %v, want -16", got.TargetLUFS)
	}
	if got.Format != "mp3" {
		t.Fatalf("Format = %q, want mp3", got.Format)
	}
}

func TestResultFilenameSanitizesInput(t *testing.T) {
	got := ResultFilename("../My Episode!.wav", "mp3")
	want := "My-Episode-postline.mp3"
	if got != want {
		t.Fatalf("ResultFilename() = %q, want %q", got, want)
	}
}
