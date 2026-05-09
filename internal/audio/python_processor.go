package audio

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
)

// PythonProcessor runs the production Python/native audio pipeline.
type PythonProcessor struct {
	PythonBin      string
	ScriptPath     string
	RNNoiseDemo    string
	WorkDir        string
	CommandTimeout string
}

// Process executes the configured Python pipeline and returns the exported file.
func (p PythonProcessor) Process(ctx context.Context, inputPath string, originalName string, options Options) (Result, error) {
	options = NormalizeOptions(options)
	workDir := p.WorkDir
	if workDir == "" {
		workDir = os.TempDir()
	}

	dir, err := os.MkdirTemp(workDir, "postline-*")
	if err != nil {
		return Result{}, fmt.Errorf("create processor work dir: %w", err)
	}

	outputPath := filepath.Join(dir, ResultFilename(originalName, options.Format))
	args := []string{
		p.ScriptPath,
		"--input", inputPath,
		"--output", outputPath,
		"--target_lufs", strconv.FormatFloat(options.TargetLUFS, 'f', 2, 64),
		"--format", options.Format,
		"--rnnoise_demo", p.RNNoiseDemo,
		"--work_dir", dir,
	}
	if options.TrimSilence {
		args = append(args, "--trim_silence")
	}
	if options.Denoise {
		args = append(args, "--denoise")
	}
	if !options.Normalize {
		args = append(args, "--skip_normalize")
	}
	if options.PreserveStereo {
		args = append(args, "--preserve_channels")
	}

	pythonBin := p.PythonBin
	if pythonBin == "" {
		pythonBin = "python3"
	}

	// #nosec G204 -- pythonBin and script path are deployment configuration, not user input.
	cmd := exec.CommandContext(ctx, pythonBin, args...)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		_ = os.RemoveAll(dir)
		return Result{}, fmt.Errorf("run audio pipeline: %w: %s", err, stderr.String())
	}

	metrics := map[string]interface{}{}
	if stdout.Len() > 0 {
		if err := json.Unmarshal(stdout.Bytes(), &metrics); err != nil {
			_ = os.RemoveAll(dir)
			return Result{}, fmt.Errorf("parse pipeline metrics: %w", err)
		}
	}

	return Result{
		Path:         outputPath,
		Filename:     filepath.Base(outputPath),
		ContentType:  ContentType(options.Format),
		Metrics:      metrics,
		CleanupPaths: []string{dir},
	}, nil
}
