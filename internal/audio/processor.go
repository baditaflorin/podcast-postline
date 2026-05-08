// Package audio defines processing interfaces and implementations.
package audio

import (
	"context"
	"fmt"
	"mime"
	"path/filepath"
	"regexp"
	"strings"
)

// Options configures one audio processing request.
type Options struct {
	TargetLUFS  float64 `validate:"gte=-30,lte=-6"`
	Format      string  `validate:"oneof=mp3 wav m4a"`
	TrimSilence bool
}

// Result describes a processed export and any temporary paths to remove.
type Result struct {
	Path         string
	Filename     string
	ContentType  string
	Metrics      map[string]any
	CleanupPaths []string
}

// Processor converts one uploaded recording into a publish-ready export.
type Processor interface {
	Process(ctx context.Context, inputPath string, originalName string, options Options) (Result, error)
}

// NormalizeOptions applies v1 defaults to processing options.
func NormalizeOptions(options Options) Options {
	if options.TargetLUFS == 0 {
		options.TargetLUFS = -16
	}
	options.Format = strings.ToLower(strings.TrimSpace(options.Format))
	if options.Format == "" {
		options.Format = "mp3"
	}
	return options
}

// ResultFilename returns a safe default output filename for a processed upload.
func ResultFilename(originalName, format string) string {
	base := strings.TrimSuffix(filepath.Base(originalName), filepath.Ext(originalName))
	base = safeName(base)
	if base == "" {
		base = "episode"
	}
	return fmt.Sprintf("%s-postline.%s", base, format)
}

// ContentType maps a supported export format to an HTTP content type.
func ContentType(format string) string {
	switch format {
	case "mp3":
		return "audio/mpeg"
	case "wav":
		return "audio/wav"
	case "m4a":
		return "audio/mp4"
	default:
		if value := mime.TypeByExtension("." + format); value != "" {
			return value
		}
		return "application/octet-stream"
	}
}

var unsafeName = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func safeName(value string) string {
	return strings.Trim(unsafeName.ReplaceAllString(value, "-"), ".-_")
}
