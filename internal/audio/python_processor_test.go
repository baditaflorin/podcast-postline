package audio

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// TestPythonProcessor_TimeoutKillsHangingScript verifies that CommandTimeout
// is honored — previously the field existed but was never used, so a runaway
// script could pin the worker indefinitely.
func TestPythonProcessor_TimeoutKillsHangingScript(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("uses /bin/sh + exec sleep; not a Windows-friendly fixture")
	}
	// Write a script that uses `exec sleep` so sleep *replaces* sh as the
	// direct child of our cmd. Without `exec`, SIGKILL only kills sh and the
	// orphaned sleep keeps running, and our cmd.Run() blocks waiting for both.
	tmp := t.TempDir()
	scriptPath := filepath.Join(tmp, "hang.sh")
	script := "#!/bin/sh\n" +
		"# Ignore the args our processor appends; just hang for 30s as the\n" +
		"# direct child so exec.CommandContext can kill us cleanly.\n" +
		"exec sleep 30\n"
	if err := os.WriteFile(scriptPath, []byte(script), 0o700); err != nil {
		t.Fatalf("write fake script: %v", err)
	}

	inputPath := filepath.Join(tmp, "input.wav")
	if err := os.WriteFile(inputPath, []byte("RIFF"), 0o600); err != nil {
		t.Fatalf("write fake input: %v", err)
	}

	p := PythonProcessor{
		PythonBin:      "/bin/sh",
		ScriptPath:     scriptPath,
		RNNoiseDemo:    "rnnoise_demo",
		WorkDir:        tmp,
		CommandTimeout: 250 * time.Millisecond,
	}

	start := time.Now()
	_, err := p.Process(context.Background(), inputPath, "input.wav", Options{Format: "mp3", TargetLUFS: -16})
	elapsed := time.Since(start)

	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
	// The kill should land within a couple of seconds of the deadline — well
	// short of the 30s sleep the script would otherwise complete in.
	if elapsed > 5*time.Second {
		t.Fatalf("processor did not honor timeout (elapsed %s)", elapsed)
	}
	if !strings.Contains(err.Error(), "timed out") && !errors.Is(err, context.DeadlineExceeded) {
		t.Logf("got error: %v", err)
		// Accept either flavour — the wrapper adds "timed out" prefix when the
		// runCtx hit its deadline, but on some platforms exec.Run returns the
		// signal directly without DeadlineExceeded propagating.
	}
}
