package audio

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type StubProcessor struct {
	WorkDir string
}

func (p StubProcessor) Process(ctx context.Context, inputPath string, originalName string, options Options) (Result, error) {
	select {
	case <-ctx.Done():
		return Result{}, ctx.Err()
	default:
	}

	options = NormalizeOptions(options)
	workDir := p.WorkDir
	if workDir == "" {
		workDir = os.TempDir()
	}

	dir, err := os.MkdirTemp(workDir, "postline-stub-*")
	if err != nil {
		return Result{}, fmt.Errorf("create stub work dir: %w", err)
	}

	outputPath := filepath.Join(dir, ResultFilename(originalName, options.Format))
	body := []byte("podcast-postline stub audio export\n")
	if err := os.WriteFile(outputPath, body, 0o600); err != nil {
		_ = os.RemoveAll(dir)
		return Result{}, fmt.Errorf("write stub output: %w", err)
	}

	return Result{
		Path:        outputPath,
		Filename:    filepath.Base(outputPath),
		ContentType: ContentType(options.Format),
		Metrics: map[string]any{
			"processor":   "stub",
			"target_lufs": options.TargetLUFS,
			"generated":   time.Now().UTC().Format(time.RFC3339),
			"input_path":  filepath.Base(inputPath),
		},
		CleanupPaths: []string{dir},
	}, nil
}
