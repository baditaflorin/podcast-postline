import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Download,
  Github,
  Info,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  UploadCloud,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { preflightAudio } from "./features/processor/api";
import { loadPreferences, savePreferences } from "./features/processor/storage";
import {
  ExportFormat,
  Issue,
  ProcessingPlan,
  processOptionsSchema,
  ProcessPreferences,
  Provenance,
} from "./features/processor/types";
import { useProcessAudio } from "./features/processor/useProcessAudio";
import { appEnv } from "./lib/env";
import { formatBytes, shortCommit } from "./lib/format";

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Choose a non-empty audio file.")
  .refine(
    (file) => file.size <= 750 * 1024 * 1024,
    "Maximum upload size is 750 MB.",
  );

type AppState =
  | "idle"
  | "selected"
  | "preflighting"
  | "ready"
  | "needs-review"
  | "blocked"
  | "processing"
  | "processed"
  | "error-recoverable";

const appStateLabels: Record<AppState, string> = {
  idle: "Waiting for audio",
  selected: "Audio selected",
  preflighting: "Inspecting audio",
  ready: "Ready",
  "needs-review": "Needs review",
  blocked: "Blocked",
  processing: "Processing",
  processed: "Export ready",
  "error-recoverable": "Needs a retry",
};

type SessionOverrides = Partial<Omit<ProcessPreferences, "apiBaseUrl">>;

export function App() {
  const initialPreferences = useMemo(
    () => loadPreferences(appEnv.apiBaseUrl),
    [],
  );
  const debugEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    [],
  );
  const [preferences, setPreferences] =
    useState<ProcessPreferences>(initialPreferences);
  const [sessionOverrides, setSessionOverrides] = useState<SessionOverrides>(
    {},
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProcessingPlan | null>(null);
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>(
    "episode-postline.mp3",
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const preflightAbortRef = useRef<AbortController | null>(null);
  const processAbortRef = useRef<AbortController | null>(null);

  const mutation = useProcessAudio({
    onSuccess: (result) => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      setDownloadUrl(result.url);
      setDownloadName(result.filename);
      setProvenance(result.provenance);
      setAppState("processed");
      processAbortRef.current = null;
    },
    onError: (error) => {
      processAbortRef.current = null;
      if (error.name === "AbortError") {
        setFileError(
          "Processing was cancelled. The original upload is unchanged.",
        );
        setAppState(plan ? stateFromPlan(plan) : "selected");
        return;
      }
      setFileError(error.message);
      setAppState("error-recoverable");
    },
  });

  const updatePreferences = (next: ProcessPreferences) => {
    setPreferences(next);
    savePreferences(next);
  };

  const updateUserPreference = (patch: Partial<ProcessPreferences>) => {
    const next = { ...preferences, ...patch };
    updatePreferences(next);
    const remembered = { ...patch };
    delete remembered.apiBaseUrl;
    setSessionOverrides((current) => ({
      ...current,
      ...(remembered as SessionOverrides),
    }));
  };

  const selectedFileMeta = file
    ? `${file.name} - ${formatBytes(file.size)}`
    : "WAV, MP3, M4A, FLAC";
  const busy = appState === "preflighting" || appState === "processing";
  const blocked = appState === "blocked";
  const canProcess = Boolean(file) && !busy && !blocked && !mutation.isPending;
  const allIssues = plan ? [...plan.anomalies, ...plan.warnings] : [];

  const runPreflight = (
    nextFile: File,
    currentPreferences: ProcessPreferences = preferences,
  ) => {
    preflightAbortRef.current?.abort();
    const controller = new AbortController();
    preflightAbortRef.current = controller;
    setPlan(null);
    setPreflightError(null);
    setFileError(null);
    setProvenance(null);
    setAppState("preflighting");

    void preflightAudio({
      file: nextFile,
      apiBaseUrl: currentPreferences.apiBaseUrl,
      targetLufs: currentPreferences.targetLufs,
      signal: controller.signal,
    })
      .then((nextPlan) => {
        if (controller.signal.aborted) return;
        setPlan(nextPlan);
        setAppState(stateFromPlan(nextPlan));
        updatePreferences({
          ...currentPreferences,
          targetLufs: nextPlan.recommended.target_lufs,
          format: normalizeExportFormat(nextPlan.recommended.format),
          trimSilence: nextPlan.recommended.trim_silence,
          denoise: nextPlan.recommended.denoise,
          normalize: nextPlan.recommended.normalize,
          preserveStereo: nextPlan.recommended.preserve_stereo,
          ...sessionOverrides,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error
            ? error.message
            : "Could not inspect the recording.";
        setPreflightError(message);
        setFileError(message);
        setAppState("error-recoverable");
      })
      .finally(() => {
        if (preflightAbortRef.current === controller) {
          preflightAbortRef.current = null;
        }
      });
  };

  const selectFile = (nextFile: File | null) => {
    preflightAbortRef.current?.abort();
    processAbortRef.current?.abort();
    mutation.reset();
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setDownloadName("episode-postline.mp3");
    setFileError(null);
    setPreflightError(null);
    setPlan(null);
    setProvenance(null);
    if (!nextFile) {
      setFile(null);
      setAppState("idle");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const parsed = fileSchema.safeParse(nextFile);
    if (!parsed.success) {
      setFile(null);
      setFileError(parsed.error.issues[0]?.message ?? "Invalid file.");
      setAppState("error-recoverable");
      return;
    }
    setFile(nextFile);
    setAppState("selected");
    runPreflight(nextFile);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files.item(0));
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.item(0) ?? null);
  };

  const process = () => {
    if (!file) {
      setFileError("Choose an audio file first.");
      return;
    }
    if (plan?.status === "blocked") {
      setFileError(
        "This recording is blocked because the app cannot make a safe processing plan.",
      );
      setAppState("blocked");
      return;
    }
    const parsed = processOptionsSchema.safeParse(preferences);
    if (!parsed.success) {
      setFileError(parsed.error.issues[0]?.message ?? "Invalid settings.");
      setAppState("error-recoverable");
      return;
    }
    const controller = new AbortController();
    processAbortRef.current = controller;
    setFileError(null);
    setAppState("processing");
    mutation.mutate({ file, options: parsed.data, signal: controller.signal });
  };

  const cancelCurrentWork = () => {
    if (appState === "preflighting") {
      preflightAbortRef.current?.abort();
      preflightAbortRef.current = null;
      setFileError(
        "Preflight was cancelled. The selected recording is intact.",
      );
      setAppState(file ? "selected" : "idle");
      return;
    }
    if (appState === "processing") {
      processAbortRef.current?.abort();
      processAbortRef.current = null;
      setFileError(
        "Processing was cancelled. The original upload is unchanged.",
      );
      setAppState(plan ? stateFromPlan(plan) : "selected");
    }
  };

  const pipelineStages = [
    {
      name: preferences.denoise ? "RNNoise denoise" : "Denoise skipped",
      enabled: preferences.denoise,
    },
    {
      name: preferences.normalize
        ? `${preferences.targetLufs} LUFS normalize`
        : "Normalize skipped",
      enabled: preferences.normalize,
    },
    {
      name: preferences.trimSilence ? "Silence trim" : "Trim skipped",
      enabled: preferences.trimSilence,
    },
    { name: "FFmpeg export", enabled: true },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#f6f1e8_0%,#edf5f1_48%,#f8e9df_100%)] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-950/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
              podcast-postline
            </p>
            <h1 className="text-2xl font-black leading-tight text-stone-950 sm:text-3xl">
              Post-production line
            </h1>
          </div>
          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Project links"
          >
            <a
              className="icon-link"
              href={appEnv.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Github aria-hidden="true" size={18} />
              GitHub
            </a>
            <a
              className="icon-link accent"
              href={appEnv.paypalUrl}
              target="_blank"
              rel="noreferrer"
            >
              <BadgeDollarSign aria-hidden="true" size={18} />
              PayPal
            </a>
          </nav>
        </header>

        <section className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.7fr)]">
          <div className="tool-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Input</p>
                <h2>Raw recording</h2>
              </div>
              {file ? (
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => selectFile(null)}
                  title="Clear file"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              ) : null}
            </div>

            <label
              className="drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
            >
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept="audio/*"
                onChange={handleFileInput}
              />
              <UploadCloud aria-hidden="true" size={34} />
              <span>{file ? "Selected file" : "Drop audio or browse"}</span>
              <strong>{selectedFileMeta}</strong>
            </label>

            {fileError ? (
              <p className="error-text" aria-live="polite">
                {fileError}
              </p>
            ) : null}

            {appState === "preflighting" ? (
              <div className="progress-panel" aria-live="polite">
                <Loader2
                  className="animate-spin"
                  aria-hidden="true"
                  size={18}
                />
                Inspecting duration, channels, silence, and format before any
                processing starts.
              </div>
            ) : null}

            {preflightError && file ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => runPreflight(file)}
              >
                <RefreshCcw aria-hidden="true" size={18} />
                Retry preflight
              </button>
            ) : null}

            {plan ? <PlanSummary plan={plan} issues={allIssues} /> : null}

            <div className="settings-grid">
              <label className="field">
                <span>
                  <Volume2 aria-hidden="true" size={16} />
                  Target LUFS
                </span>
                <div className="range-row">
                  <input
                    type="range"
                    min="-24"
                    max="-10"
                    step="0.5"
                    value={preferences.targetLufs}
                    onChange={(event) =>
                      updateUserPreference({
                        targetLufs: Number(event.currentTarget.value),
                      })
                    }
                  />
                  <input
                    type="number"
                    min="-30"
                    max="-6"
                    step="0.5"
                    value={preferences.targetLufs}
                    onChange={(event) =>
                      updateUserPreference({
                        targetLufs: Number(event.currentTarget.value),
                      })
                    }
                  />
                </div>
              </label>

              <div className="field">
                <span>
                  <SlidersHorizontal aria-hidden="true" size={16} />
                  Export
                </span>
                <div
                  className="segmented"
                  role="radiogroup"
                  aria-label="Export format"
                >
                  {(["mp3", "wav", "m4a"] as ExportFormat[]).map((format) => (
                    <button
                      key={format}
                      type="button"
                      className={preferences.format === format ? "active" : ""}
                      onClick={() => updateUserPreference({ format })}
                      role="radio"
                      aria-checked={preferences.format === format}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={preferences.denoise}
                  onChange={(event) =>
                    updateUserPreference({
                      denoise: event.currentTarget.checked,
                    })
                  }
                />
                <span>Denoise speech</span>
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={preferences.normalize}
                  onChange={(event) =>
                    updateUserPreference({
                      normalize: event.currentTarget.checked,
                    })
                  }
                />
                <span>Normalize loudness</span>
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={preferences.trimSilence}
                  onChange={(event) =>
                    updateUserPreference({
                      trimSilence: event.currentTarget.checked,
                    })
                  }
                />
                <span>Trim silence</span>
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={preferences.preserveStereo}
                  onChange={(event) =>
                    updateUserPreference({
                      preserveStereo: event.currentTarget.checked,
                    })
                  }
                />
                <span>Preserve stereo</span>
              </label>

              <label className="field api-field">
                <span>API base URL</span>
                <input
                  type="url"
                  value={preferences.apiBaseUrl}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      apiBaseUrl: event.currentTarget.value,
                    })
                  }
                />
              </label>
            </div>

            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                disabled={!canProcess}
                onClick={process}
              >
                {mutation.isPending || appState === "processing" ? (
                  <Loader2
                    className="animate-spin"
                    aria-hidden="true"
                    size={18}
                  />
                ) : (
                  <Wand2 aria-hidden="true" size={18} />
                )}
                {mutation.isPending || appState === "processing"
                  ? "Processing"
                  : "Run postline"}
              </button>
              {busy ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={cancelCurrentWork}
                >
                  <Square aria-hidden="true" size={16} />
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <aside className="status-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Output</p>
                <h2>Publish-ready export</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  mutation.reset();
                  setFileError(null);
                  setAppState(
                    plan ? stateFromPlan(plan) : file ? "selected" : "idle",
                  );
                }}
                title="Reset status"
                disabled={busy}
              >
                <RefreshCcw aria-hidden="true" size={18} />
              </button>
            </div>

            <div className={`state-pill ${stateClass(appState)}`}>
              {appState === "ready" || appState === "processed" ? (
                <CheckCircle2 aria-hidden="true" size={17} />
              ) : appState === "blocked" || appState === "error-recoverable" ? (
                <AlertTriangle aria-hidden="true" size={17} />
              ) : (
                <Info aria-hidden="true" size={17} />
              )}
              {appStateLabels[appState]}
            </div>

            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 42 }).map((_, index) => (
                <span
                  key={index}
                  style={{ height: `${18 + ((index * 17) % 54)}%` }}
                />
              ))}
            </div>

            <ol className="pipeline-list" aria-label="Processing stages">
              {pipelineStages.map((stage, index) => (
                <li
                  key={stage.name}
                  className={[
                    appState === "processing" || appState === "processed"
                      ? "lit"
                      : "",
                    stage.enabled ? "" : "muted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>{index + 1}</span>
                  {stage.name}
                </li>
              ))}
            </ol>

            {mutation.error && appState !== "processing" ? (
              <p className="error-box">{mutation.error.message}</p>
            ) : null}

            {downloadUrl ? (
              <a
                className="download-button"
                href={downloadUrl}
                download={downloadName}
              >
                <Download aria-hidden="true" size={18} />
                Download {downloadName}
              </a>
            ) : (
              <div className="empty-output">
                <Download aria-hidden="true" size={22} />
                <span>Awaiting export</span>
              </div>
            )}

            {provenance ? <ProvenanceSummary provenance={provenance} /> : null}

            {debugEnabled ? (
              <pre className="debug-panel">
                {JSON.stringify(
                  {
                    appState,
                    plan,
                    provenance,
                    preferences,
                    sessionOverrides,
                  },
                  null,
                  2,
                )}
              </pre>
            ) : null}

            <footer className="version-strip">
              <span>v{appEnv.version}</span>
              <span>{shortCommit(appEnv.commit)}</span>
            </footer>
          </aside>
        </section>
      </div>
    </main>
  );
}

function PlanSummary({
  plan,
  issues,
}: {
  plan: ProcessingPlan;
  issues: Issue[];
}) {
  const confidence = `${Math.round(plan.confidence * 100)}%`;
  return (
    <section className={`insight-panel ${plan.status}`} aria-live="polite">
      <div className="insight-header">
        {plan.status === "blocked" ? (
          <AlertTriangle aria-hidden="true" size={20} />
        ) : plan.status === "needs_review" ? (
          <Info aria-hidden="true" size={20} />
        ) : (
          <ShieldCheck aria-hidden="true" size={20} />
        )}
        <div>
          <p className="eyebrow">First guess</p>
          <h3>{plan.label}</h3>
        </div>
        <strong>{confidence}</strong>
      </div>
      <div className="facts-grid">
        <span>{formatDuration(plan.profile.duration_seconds)}</span>
        <span>{plan.profile.channels || "?"} channel(s)</span>
        <span>{plan.profile.format.toUpperCase() || "AUDIO"}</span>
        <span>{formatBytes(plan.profile.size_bytes)}</span>
      </div>
      <p className="reason-line">
        {plan.reasons[0] ?? "The processing plan was inferred from the upload."}
      </p>
      {issues.length > 0 ? (
        <ul className="issue-list">
          {issues.map((issue) => (
            <li key={`${issue.severity}-${issue.code}`}>
              <strong>{issue.message}</strong>
              <span>{issue.why}</span>
              <small>{issue.next}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="success-text">
          No blockers or warnings detected. The defaults are ready to run.
        </p>
      )}
    </section>
  );
}

function ProvenanceSummary({ provenance }: { provenance: Provenance }) {
  return (
    <section className="provenance-panel">
      <strong>Export provenance</strong>
      <span>Plan {provenance.plan_id}</span>
      <span>Confidence {Math.round(provenance.confidence * 100)}%</span>
      <span>
        v{provenance.app_version} {shortCommit(provenance.commit)}
      </span>
    </section>
  );
}

function stateFromPlan(plan: ProcessingPlan): AppState {
  if (plan.status === "blocked") return "blocked";
  if (plan.status === "needs_review") return "needs-review";
  return "ready";
}

function stateClass(state: AppState) {
  if (state === "ready" || state === "processed") return "good";
  if (state === "blocked" || state === "error-recoverable") return "bad";
  if (state === "needs-review") return "warn";
  return "neutral";
}

function normalizeExportFormat(format: string): ExportFormat {
  if (format === "wav" || format === "m4a") return format;
  return "mp3";
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "unknown length";
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
