// Package observability defines Prometheus metrics for the backend.
package observability

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics owns the Prometheus registry and project-specific collectors.
type Metrics struct {
	Registry       *prometheus.Registry
	httpDuration   *prometheus.HistogramVec
	httpRequests   *prometheus.CounterVec
	audioDuration  *prometheus.HistogramVec
	audioSucceeded prometheus.Counter
	audioFailed    prometheus.Counter
}

// NewMetrics registers HTTP, audio, Go runtime, and process collectors.
func NewMetrics() *Metrics {
	registry := prometheus.NewRegistry()

	metrics := &Metrics{
		Registry: registry,
		httpDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "postline_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "route", "status"}),
		httpRequests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "postline_http_requests_total",
			Help: "HTTP requests by method, route, and status.",
		}, []string{"method", "route", "status"}),
		audioDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "postline_audio_process_duration_seconds",
			Help:    "Audio processing duration in seconds.",
			Buckets: []float64{1, 5, 15, 30, 60, 120, 300, 600, 1200, 3600},
		}, []string{"format", "status"}),
		audioSucceeded: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "postline_audio_process_success_total",
			Help: "Successful audio processing jobs.",
		}),
		audioFailed: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "postline_audio_process_failure_total",
			Help: "Failed audio processing jobs.",
		}),
	}

	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		metrics.httpDuration,
		metrics.httpRequests,
		metrics.audioDuration,
		metrics.audioSucceeded,
		metrics.audioFailed,
	)

	return metrics
}

// Handler returns the Prometheus scrape endpoint handler.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.Registry, promhttp.HandlerOpts{})
}

// Middleware records request counts and durations for every HTTP request.
func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()

		next.ServeHTTP(recorder, r)

		route := routePattern(r)
		status := strconv.Itoa(recorder.status)
		m.httpDuration.WithLabelValues(r.Method, route, status).Observe(time.Since(start).Seconds())
		m.httpRequests.WithLabelValues(r.Method, route, status).Inc()
	})
}

// ObserveAudio records the duration and outcome of one audio processing request.
func (m *Metrics) ObserveAudio(format string, duration time.Duration, success bool) {
	status := "success"
	if !success {
		status = "failure"
		m.audioFailed.Inc()
	} else {
		m.audioSucceeded.Inc()
	}
	m.audioDuration.WithLabelValues(format, status).Observe(duration.Seconds())
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func routePattern(r *http.Request) string {
	if routeContext := chi.RouteContext(r.Context()); routeContext != nil {
		if pattern := routeContext.RoutePattern(); pattern != "" {
			return pattern
		}
	}
	return r.URL.Path
}
