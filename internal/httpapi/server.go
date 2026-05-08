package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/baditaflorin/podcast-postline/internal/audio"
	"github.com/baditaflorin/podcast-postline/internal/config"
	"github.com/baditaflorin/podcast-postline/internal/observability"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-playground/validator/v10"
)

// Server owns HTTP handlers and shared API dependencies.
type Server struct {
	cfg       config.Config
	processor audio.Processor
	metrics   *observability.Metrics
	logger    *slog.Logger
	validator *validator.Validate
}

// NewRouter builds the API router with middleware, CORS, metrics, and routes.
func NewRouter(cfg config.Config, processor audio.Processor, metrics *observability.Metrics, logger *slog.Logger) http.Handler {
	server := &Server{
		cfg:       cfg,
		processor: processor,
		metrics:   metrics,
		logger:    logger,
		validator: validator.New(validator.WithRequiredStructEnabled()),
	}

	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(server.recoverer)
	router.Use(server.requestLogger)
	router.Use(metrics.Middleware)
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Requested-With"},
		ExposedHeaders:   []string{"Content-Disposition", "X-Postline-Version"},
		AllowCredentials: false,
		MaxAge:           int((12 * time.Hour).Seconds()),
	}))

	router.Get("/healthz", server.healthz)
	router.Get("/readyz", server.readyz)
	router.Handle("/metrics", metrics.Handler())
	router.Route("/api", func(r chi.Router) {
		r.Get("/version", server.version)
		r.Post("/process", server.process)
	})

	return router
}
