import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Clipboard,
  Code2,
  Copy,
  Download,
  FileAudio,
  FileJson,
  Github,
  Info,
  Link,
  Loader2,
  Printer,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  UploadCloud,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  ClipboardEvent as ReactClipboardEvent,
  DragEvent,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import {
  audioFilesFromList,
  classifyAudioFile,
  createDemoWavFile,
  filesFromPaste,
  readClipboardAudioFiles,
  stableFileId,
} from "./features/processor/fileInput";
import { preflightAudio } from "./features/processor/api";
import {
  clearWorkspace,
  defaultPreferences,
  loadPreferences,
  loadWorkspace,
  savePreferences,
  saveWorkspace,
} from "./features/processor/storage";
import { curlSnippet, pythonSnippet } from "./features/processor/snippets";
import {
  ExportFormat,
  Issue,
  ProcessingPlan,
  ProcessPreferences,
  Provenance,
  exportFormats,
  processOptionsSchema,
} from "./features/processor/types";
import { useProcessAudio } from "./features/processor/useProcessAudio";
import {
  ActivityEntry,
  JobSnapshot,
  WorkspaceSnapshot,
  createWorkspaceSnapshot,
  decodeWorkspaceHash,
  encodeWorkspaceHash,
  parseWorkspace,
  stableWorkspaceJson,
  workspaceFilename,
} from "./features/processor/workspace";
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
  | "queued"
  | "restored"
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
  queued: "Queued",
  restored: "Reattach audio",
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

type AudioJob = {
  id: string;
  file: File | null;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  formatGuess: string;
  inputConfidence: number;
  inputWarning: string | null;
  status: AppState;
  plan: ProcessingPlan | null;
  provenance: Provenance | null;
  downloadUrl: string | null;
  downloadName: string;
  error: string | null;
  preflightError: string | null;
};

export function App() {
  const initialPreferences = useMemo(
    () => loadPreferences(appEnv.apiBaseUrl),
    [],
  );
  const initialWorkspace = useMemo(() => {
    const fromHash = decodeWorkspaceHash(window.location.hash);
    return fromHash ?? loadWorkspace();
  }, []);
  const debugEnabled = useMemo(
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    [],
  );
  const [preferences, setPreferences] = useState<ProcessPreferences>(
    initialWorkspace?.preferences ?? initialPreferences,
  );
  const [sessionOverrides, setSessionOverrides] = useState<SessionOverrides>(
    initialWorkspace?.session_overrides ?? {},
  );
  const [jobs, setJobs] = useState<AudioJob[]>(
    initialWorkspace ? jobsFromSnapshot(initialWorkspace.jobs) : [],
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    initialWorkspace?.selected_job_id ?? initialWorkspace?.jobs[0]?.id ?? null,
  );
  const [activity, setActivity] = useState<ActivityEntry[]>(
    initialWorkspace?.activity ?? [],
  );
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [clipboardStatus, setClipboardStatus] = useState<string | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(
    initialWorkspace
      ? "Workspace metadata was restored. Reattach original audio files before processing."
      : null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const preflightAbortRef = useRef<AbortController | null>(null);
  const processAbortRef = useRef<AbortController | null>(null);
  const processingJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    saveWorkspace(
      buildSnapshot({
        preferences,
        jobs,
        selectedJobId,
        sessionOverrides,
        activity,
      }),
    );
  }, [activity, jobs, preferences, selectedJobId, sessionOverrides]);

  const activeJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const appState = activeJob?.status ?? "idle";
  const plan = activeJob?.plan ?? null;
  const provenance = activeJob?.provenance ?? null;
  const activeFile = activeJob?.file ?? null;
  const selectedFileMeta = activeJob
    ? `${activeJob.name} - ${formatBytes(activeJob.size)}`
    : "WAV, MP3, M4A, FLAC";
  const busy = appState === "preflighting" || appState === "processing";
  const blocked = appState === "blocked";
  const canProcess =
    Boolean(activeFile) && !busy && !blocked && appState !== "queued";
  const allIssues = plan ? [...plan.anomalies, ...plan.warnings] : [];
  const apiBaseUrlValid = z
    .string()
    .url()
    .safeParse(preferences.apiBaseUrl).success;
  const activeSnippetName = activeJob?.name ?? "episode.wav";
  const curlCommand = curlSnippet(activeSnippetName, preferences);
  const pythonCommand = pythonSnippet(activeSnippetName, preferences);

  const mutation = useProcessAudio({
    onSuccess: (result) => {
      const jobId = processingJobIdRef.current;
      processAbortRef.current = null;
      processingJobIdRef.current = null;
      if (!jobId) return;
      setJobs((current) =>
        current.map((job) => {
          if (job.id !== jobId) return job;
          if (job.downloadUrl) URL.revokeObjectURL(job.downloadUrl);
          return {
            ...job,
            downloadUrl: result.url,
            downloadName: result.filename,
            provenance: result.provenance,
            status: "processed",
            error: null,
          };
        }),
      );
      addActivity(`Processed ${result.filename}.`);
    },
    onError: (error) => {
      const jobId = processingJobIdRef.current;
      processAbortRef.current = null;
      processingJobIdRef.current = null;
      if (!jobId) return;
      setJobs((current) =>
        current.map((job) => {
          if (job.id !== jobId) return job;
          if (error.name === "AbortError") {
            return {
              ...job,
              error:
                "Processing was cancelled. The original upload is unchanged.",
              status: job.plan ? stateFromPlan(job.plan) : "selected",
            };
          }
          return {
            ...job,
            error: error.message,
            status: "error-recoverable",
          };
        }),
      );
    },
  });

  const updatePreferences = (next: ProcessPreferences) => {
    setPreferences(next);
    savePreferences(next);
  };

  const updateUserPreference = (patch: Partial<ProcessPreferences>) => {
    const next = { ...preferences, ...patch };
    updatePreferences(next);
    const remembered = sessionOverridePatch(patch);
    setSessionOverrides((current) => ({ ...current, ...remembered }));
    addActivity("Updated processing settings.");
  };

  const saveCurrentWorkspace = (nextJobs = jobs) => {
    const snapshot = buildSnapshot({
      preferences,
      jobs: nextJobs,
      selectedJobId,
      sessionOverrides,
      activity,
    });
    saveWorkspace(snapshot);
    return snapshot;
  };

  const addFiles = (files: File[], source: string) => {
    setGlobalError(null);
    setRestoreNotice(null);
    const accepted: AudioJob[] = [];
    const rejected: string[] = [];
    const existingIds = new Set(jobs.map((job) => job.id));

    for (const file of files) {
      const parsed = fileSchema.safeParse(file);
      if (!parsed.success) {
        rejected.push(
          `${file.name}: ${parsed.error.issues[0]?.message ?? "Invalid file."}`,
        );
        continue;
      }
      const finding = classifyAudioFile(file);
      const id = stableFileId(file, existingIds);
      existingIds.add(id);
      accepted.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        formatGuess: finding.format,
        inputConfidence: finding.confidence,
        inputWarning: finding.warning,
        status: "queued",
        plan: null,
        provenance: null,
        downloadUrl: null,
        downloadName: fallbackDownloadName(file.name, preferences.format),
        error: finding.warning,
        preflightError: null,
      });
    }

    if (rejected.length > 0) {
      setGlobalError(rejected.join(" "));
    }
    if (accepted.length === 0) {
      if (files.length === 0) {
        setGlobalError(
          "No audio files were found. Use WAV, MP3, M4A, or FLAC.",
        );
      }
      return;
    }

    setJobs((current) => {
      const next = [...current, ...accepted];
      saveCurrentWorkspace(next);
      return next;
    });
    addActivity(`Added ${accepted.length} recording(s) from ${source}.`);

    if (!activeJob || activeJob.status === "restored") {
      const first = accepted[0];
      setSelectedJobId(first.id);
      runPreflight(first);
    }
  };

  const runPreflight = (
    job: AudioJob,
    currentPreferences: ProcessPreferences = preferences,
  ) => {
    if (!job.file) {
      patchJob(job.id, {
        status: "restored",
        error:
          "Reattach the original audio file before preflight or processing.",
      });
      return;
    }

    preflightAbortRef.current?.abort();
    const controller = new AbortController();
    preflightAbortRef.current = controller;
    patchJob(job.id, {
      plan: null,
      preflightError: null,
      error: null,
      provenance: null,
      status: "preflighting",
    });

    void preflightAudio({
      file: job.file,
      apiBaseUrl: currentPreferences.apiBaseUrl,
      targetLufs: currentPreferences.targetLufs,
      signal: controller.signal,
    })
      .then((nextPlan) => {
        if (controller.signal.aborted) return;
        patchJob(job.id, {
          plan: nextPlan,
          status: stateFromPlan(nextPlan),
          error: null,
          preflightError: null,
          downloadName: fallbackDownloadName(
            job.name,
            nextPlan.recommended.format,
          ),
        });
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
        addActivity(`Preflight completed for ${job.name}.`);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error
            ? error.message
            : "Could not inspect the recording.";
        patchJob(job.id, {
          preflightError: message,
          error: message,
          status: "error-recoverable",
        });
      })
      .finally(() => {
        if (preflightAbortRef.current === controller) {
          preflightAbortRef.current = null;
        }
      });
  };

  const chooseJob = (job: AudioJob) => {
    if (busy) {
      setGlobalError(
        "Finish or cancel the current operation before switching recordings.",
      );
      return;
    }
    setSelectedJobId(job.id);
    setGlobalError(null);
    if (job.file && (job.status === "queued" || job.status === "selected")) {
      runPreflight(job);
    }
  };

  const process = () => {
    if (!activeJob || !activeJob.file) {
      setGlobalError("Choose or reattach an audio file first.");
      return;
    }
    if (activeJob.plan?.status === "blocked") {
      patchJob(activeJob.id, {
        error:
          "This recording is blocked because the app cannot make a safe processing plan.",
        status: "blocked",
      });
      return;
    }
    const parsed = processOptionsSchema.safeParse(preferences);
    if (!parsed.success) {
      patchJob(activeJob.id, {
        error: parsed.error.issues[0]?.message ?? "Invalid settings.",
        status: "error-recoverable",
      });
      return;
    }
    const controller = new AbortController();
    processAbortRef.current = controller;
    processingJobIdRef.current = activeJob.id;
    patchJob(activeJob.id, { error: null, status: "processing" });
    mutation.mutate({
      file: activeJob.file,
      options: parsed.data,
      signal: controller.signal,
    });
  };

  const cancelCurrentWork = () => {
    if (!activeJob) return;
    if (activeJob.status === "preflighting") {
      preflightAbortRef.current?.abort();
      preflightAbortRef.current = null;
      patchJob(activeJob.id, {
        error: "Preflight was cancelled. The selected recording is intact.",
        status: activeJob.file ? "selected" : "restored",
      });
      return;
    }
    if (activeJob.status === "processing") {
      processAbortRef.current?.abort();
      processAbortRef.current = null;
      patchJob(activeJob.id, {
        error: "Processing was cancelled. The original upload is unchanged.",
        status: activeJob.plan ? stateFromPlan(activeJob.plan) : "selected",
      });
    }
  };

  const clearActiveJob = () => {
    if (!activeJob) return;
    revokeJob(activeJob);
    const remaining = jobs.filter((job) => job.id !== activeJob.id);
    setJobs(remaining);
    setSelectedJobId(remaining[0]?.id ?? null);
    addActivity(`Removed ${activeJob.name} from the queue.`);
  };

  const startFresh = () => {
    preflightAbortRef.current?.abort();
    processAbortRef.current?.abort();
    for (const job of jobs) revokeJob(job);
    const nextPreferences = defaultPreferences(appEnv.apiBaseUrl);
    setJobs([]);
    setSelectedJobId(null);
    setActivity([]);
    setSessionOverrides({});
    setPreferences(nextPreferences);
    setGlobalError(null);
    setClipboardStatus(null);
    setRestoreNotice(null);
    clearWorkspace();
    savePreferences(nextPreferences);
    mutation.reset();
  };

  const exportWorkspace = () => {
    const snapshot = buildSnapshot({
      preferences,
      jobs,
      selectedJobId,
      sessionOverrides,
      activity,
    });
    downloadText(
      workspaceFilename(snapshot),
      stableWorkspaceJson(snapshot),
      "application/json",
    );
    saveWorkspace(snapshot);
    addActivity("Downloaded workspace state.");
  };

  const importWorkspace = async (file: File) => {
    try {
      const snapshot = parseWorkspace(JSON.parse(await file.text()));
      restoreWorkspace(
        snapshot,
        "Imported workspace state. Reattach original audio files before processing.",
      );
    } catch {
      setGlobalError(
        "Workspace import failed. Choose a valid .postline.json export from this app.",
      );
    }
  };

  const restoreWorkspace = (snapshot: WorkspaceSnapshot, notice: string) => {
    for (const job of jobs) revokeJob(job);
    setPreferences(snapshot.preferences);
    savePreferences(snapshot.preferences);
    setSessionOverrides(snapshot.session_overrides);
    setJobs(jobsFromSnapshot(snapshot.jobs));
    setSelectedJobId(snapshot.selected_job_id ?? snapshot.jobs[0]?.id ?? null);
    setActivity(snapshot.activity);
    setRestoreNotice(notice);
    setGlobalError(null);
    saveWorkspace(snapshot);
    addActivity("Restored workspace metadata.");
  };

  const shareWorkspace = async () => {
    const snapshot = buildSnapshot({
      preferences,
      jobs,
      selectedJobId,
      sessionOverrides,
      activity,
    });
    const hash = encodeWorkspaceHash(snapshot);
    if (hash.length > 8000) {
      setGlobalError(
        "This workspace is too large for a reliable share link. Download the state file instead.",
      );
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    window.history.replaceState(null, "", `#${hash}`);
    await copyText("Share link", url);
    addActivity("Created share link.");
  };

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setClipboardStatus(`${label} copied.`);
    } catch {
      setClipboardStatus(
        `${label} is visible below. Select it manually if clipboard permission is blocked.`,
      );
    }
  };

  const copyProvenance = async () => {
    if (!provenance) return;
    await copyText(
      "Provenance JSON",
      `${JSON.stringify(provenance, null, 2)}\n`,
    );
  };

  const downloadProvenance = () => {
    if (!provenance) return;
    downloadText(
      `${activeSnippetName.replace(/\.[^.]+$/, "") || "episode"}.provenance.json`,
      `${JSON.stringify(provenance, null, 2)}\n`,
      "application/json",
    );
    addActivity("Downloaded provenance JSON.");
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    addFiles(audioFilesFromList(event.dataTransfer.files), "drag/drop");
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []), "file picker");
    event.currentTarget.value = "";
  };

  const handleImportInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    if (file) void importWorkspace(file);
    event.currentTarget.value = "";
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLElement>) => {
    const files = filesFromPaste(event.nativeEvent);
    if (files.length === 0) return;
    event.preventDefault();
    addFiles(files, "clipboard paste");
  };

  const loadDemo = () => addFiles([createDemoWavFile()], "generated sample");

  const readClipboard = async () => {
    try {
      addFiles(await readClipboardAudioFiles(), "clipboard read");
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Clipboard read failed. Use paste, drag/drop, or the file picker.",
      );
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
    <main
      className="min-h-screen bg-[linear-gradient(145deg,#f6f1e8_0%,#edf5f1_48%,#f8e9df_100%)] text-stone-950"
      onPaste={handlePaste}
    >
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
                <h2>Raw recordings</h2>
              </div>
              {activeJob ? (
                <button
                  className="icon-button"
                  type="button"
                  onClick={clearActiveJob}
                  title="Remove active recording"
                  disabled={busy}
                >
                  <X aria-hidden="true" size={18} />
                </button>
              ) : null}
            </div>

            <div className="input-actions" aria-label="Input actions">
              <button
                className="secondary-button"
                type="button"
                onClick={loadDemo}
              >
                <FileAudio aria-hidden="true" size={18} />
                Sample
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={readClipboard}
              >
                <Clipboard aria-hidden="true" size={18} />
                Paste audio
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => importRef.current?.click()}
              >
                <FileJson aria-hidden="true" size={18} />
                Import state
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={startFresh}
              >
                <RotateCcw aria-hidden="true" size={18} />
                Start fresh
              </button>
            </div>

            <input
              ref={importRef}
              className="sr-only"
              type="file"
              accept="application/json,.json,.postline.json"
              onChange={handleImportInput}
            />

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
                accept="audio/*,.wav,.mp3,.m4a,.flac"
                multiple
                onChange={handleFileInput}
              />
              <UploadCloud aria-hidden="true" size={34} />
              <span>
                {activeJob ? "Active recording" : "Drop audio or browse"}
              </span>
              <strong>{selectedFileMeta}</strong>
            </label>

            <p className="guidance-text">
              Browser URL imports are intentionally not shown: many podcast
              hosts and cloud drives block cross-origin audio fetches. Download
              the recording first, or use the API snippet from your server.
            </p>

            {restoreNotice ? (
              <p className="notice-text" aria-live="polite">
                {restoreNotice}
              </p>
            ) : null}
            {globalError ? (
              <p className="error-text" aria-live="polite">
                {globalError}
              </p>
            ) : null}
            {activeJob?.error ? (
              <p className="error-text" aria-live="polite">
                {activeJob.error}
              </p>
            ) : null}

            {jobs.length > 0 ? (
              <section className="queue-panel" aria-label="Recording queue">
                <div className="queue-header">
                  <strong>{jobs.length} recording(s)</strong>
                  <span>Process one active recording at a time.</span>
                </div>
                <ul>
                  {jobs.map((job) => (
                    <li key={job.id}>
                      <button
                        type="button"
                        className={job.id === selectedJobId ? "active" : ""}
                        onClick={() => chooseJob(job)}
                        disabled={busy && job.id !== selectedJobId}
                      >
                        <span>{job.name}</span>
                        <small>
                          {appStateLabels[job.status]} -{" "}
                          {Math.round(job.inputConfidence * 100)}% input match
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {appState === "preflighting" ? (
              <div className="progress-panel" aria-live="polite">
                <Loader2
                  className="animate-spin"
                  aria-hidden="true"
                  size={18}
                />
                Inspecting duration, channels, silence, and format before
                processing starts.
              </div>
            ) : null}

            {activeJob?.preflightError && activeJob.file ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => runPreflight(activeJob)}
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
                  {exportFormats.map((format) => (
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
                  aria-invalid={!apiBaseUrlValid}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      apiBaseUrl: event.currentTarget.value,
                    })
                  }
                />
                {!apiBaseUrlValid ? (
                  <small>
                    Use a complete URL such as http://localhost:8080.
                  </small>
                ) : null}
              </label>
            </div>

            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                disabled={!canProcess}
                onClick={process}
              >
                {appState === "processing" ? (
                  <Loader2
                    className="animate-spin"
                    aria-hidden="true"
                    size={18}
                  />
                ) : (
                  <Wand2 aria-hidden="true" size={18} />
                )}
                {appState === "processing" ? "Processing" : "Run postline"}
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
                  setGlobalError(null);
                  if (activeJob) {
                    patchJob(activeJob.id, {
                      error: null,
                      status: activeJob.plan
                        ? stateFromPlan(activeJob.plan)
                        : activeJob.file
                          ? "selected"
                          : "restored",
                    });
                  }
                }}
                title="Reset active status"
                disabled={busy || !activeJob}
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

            {activeJob?.downloadUrl ? (
              <a
                className="download-button"
                href={activeJob.downloadUrl}
                download={activeJob.downloadName}
              >
                <Download aria-hidden="true" size={18} />
                Download {activeJob.downloadName}
              </a>
            ) : (
              <div className="empty-output">
                <Download aria-hidden="true" size={22} />
                <span>Awaiting export</span>
              </div>
            )}

            <div className="output-actions" aria-label="Output actions">
              <button
                className="secondary-button"
                type="button"
                onClick={exportWorkspace}
              >
                <FileJson aria-hidden="true" size={18} />
                Download state
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={shareWorkspace}
              >
                <Link aria-hidden="true" size={18} />
                Share state
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={downloadProvenance}
                disabled={!provenance}
              >
                <Download aria-hidden="true" size={18} />
                Provenance
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={copyProvenance}
                disabled={!provenance}
              >
                <Copy aria-hidden="true" size={18} />
                Copy JSON
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void copyText("curl command", curlCommand)}
              >
                <Code2 aria-hidden="true" size={18} />
                Copy curl
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => window.print()}
              >
                <Printer aria-hidden="true" size={18} />
                Print
              </button>
            </div>

            {clipboardStatus ? (
              <p className="notice-text" aria-live="polite">
                {clipboardStatus}
              </p>
            ) : null}

            <details className="snippet-panel">
              <summary>Automation snippets</summary>
              <strong>curl</strong>
              <pre>{curlCommand}</pre>
              <strong>Python</strong>
              <pre>{pythonCommand}</pre>
            </details>

            {provenance ? <ProvenanceSummary provenance={provenance} /> : null}

            {activity.length > 0 ? (
              <section className="activity-panel">
                <strong>Activity</strong>
                <ol>
                  {activity.slice(0, 6).map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.message}</span>
                      <small>{new Date(entry.at).toLocaleString()}</small>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {debugEnabled ? (
              <pre className="debug-panel">
                {JSON.stringify(
                  {
                    appState,
                    jobs: jobs.map(jobToSnapshot),
                    provenance,
                    preferences,
                    sessionOverrides,
                    activity,
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

  function patchJob(id: string, patch: Partial<AudioJob>) {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    );
  }

  function addActivity(message: string) {
    setActivity((current) => {
      const next = [
        {
          id: `${Date.now()}-${current.length + 1}`,
          at: new Date().toISOString(),
          message,
        },
        ...current,
      ].slice(0, 50);
      return next;
    });
  }
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

function fallbackDownloadName(name: string, format: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${base || "episode"}-postline.${format}`;
}

function sessionOverridePatch(
  patch: Partial<ProcessPreferences>,
): SessionOverrides {
  return {
    ...(patch.targetLufs === undefined ? {} : { targetLufs: patch.targetLufs }),
    ...(patch.format === undefined ? {} : { format: patch.format }),
    ...(patch.trimSilence === undefined
      ? {}
      : { trimSilence: patch.trimSilence }),
    ...(patch.denoise === undefined ? {} : { denoise: patch.denoise }),
    ...(patch.normalize === undefined ? {} : { normalize: patch.normalize }),
    ...(patch.preserveStereo === undefined
      ? {}
      : { preserveStereo: patch.preserveStereo }),
  };
}

function jobsFromSnapshot(snapshots: JobSnapshot[]): AudioJob[] {
  return snapshots.map((job) => ({
    id: job.id,
    file: null,
    name: job.name,
    size: job.size,
    type: job.type,
    lastModified: job.last_modified,
    formatGuess: job.format_guess,
    inputConfidence: job.confidence,
    inputWarning: job.warning,
    status: "restored",
    plan: job.plan,
    provenance: job.provenance,
    downloadUrl: null,
    downloadName: fallbackDownloadName(
      job.name,
      job.plan?.recommended.format ?? "mp3",
    ),
    error:
      "Workspace metadata restored. Reattach this audio file to process again.",
    preflightError: null,
  }));
}

function jobToSnapshot(job: AudioJob) {
  return {
    id: job.id,
    name: job.name,
    size: job.size,
    type: job.type,
    lastModified: job.lastModified,
    formatGuess: job.formatGuess,
    confidence: job.inputConfidence,
    status: job.status,
    warning: job.inputWarning,
    error: job.error,
    plan: job.plan,
    provenance: job.provenance,
  };
}

function buildSnapshot({
  preferences,
  jobs,
  selectedJobId,
  sessionOverrides,
  activity,
}: {
  preferences: ProcessPreferences;
  jobs: AudioJob[];
  selectedJobId: string | null;
  sessionOverrides: SessionOverrides;
  activity: ActivityEntry[];
}) {
  return createWorkspaceSnapshot({
    appVersion: appEnv.version,
    commit: appEnv.commit,
    preferences,
    selectedJobId,
    jobs: jobs.map(jobToSnapshot),
    sessionOverrides,
    activity,
  });
}

function revokeJob(job: AudioJob) {
  if (job.downloadUrl) URL.revokeObjectURL(job.downloadUrl);
}

function downloadText(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
