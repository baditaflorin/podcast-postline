package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/baditaflorin/podcast-postline/internal/audio"
	"github.com/baditaflorin/podcast-postline/internal/config"
	"github.com/baditaflorin/podcast-postline/internal/httpapi"
	"github.com/baditaflorin/podcast-postline/internal/observability"
	"github.com/baditaflorin/podcast-postline/internal/utils"
	"github.com/baditaflorin/podcast-postline/internal/version"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "check local /healthz endpoint and exit")
	flag.Parse()

	cfg, err := config.Load()
	if utils.HandleErrorOrLogWithMessages(err, "load configuration failed", "") {
		os.Exit(1)
	}

	if *healthcheck {
		if err := runHealthcheck(cfg.Port); err != nil {
			fmt.Fprintln(os.Stderr, err.Error())
			os.Exit(1)
		}
		return
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	processor := buildProcessor(cfg)
	metrics := observability.NewMetrics()
	router := httpapi.NewRouter(cfg, processor, metrics, logger)
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Minute,
		WriteTimeout:      30 * time.Minute,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("server starting",
			slog.String("port", cfg.Port),
			slog.String("version", version.Version),
			slog.String("commit", version.Commit),
			slog.String("processor", cfg.ProcessorMode),
		)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server stopped unexpectedly", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown failed", "error", err)
		os.Exit(1)
	}
	logger.Info("server stopped")
}

func buildProcessor(cfg config.Config) audio.Processor {
	if cfg.ProcessorMode == "stub" {
		return audio.StubProcessor{WorkDir: cfg.WorkDir}
	}
	return audio.PythonProcessor{
		PythonBin:   cfg.PythonBin,
		ScriptPath:  cfg.PipelineScript,
		RNNoiseDemo: cfg.RNNoiseDemo,
		WorkDir:     cfg.WorkDir,
	}
}

func runHealthcheck(port string) error {
	client := http.Client{Timeout: 3 * time.Second}
	response, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return fmt.Errorf("healthcheck request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("healthcheck status = %d", response.StatusCode)
	}
	return nil
}
