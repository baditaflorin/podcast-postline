import {
  BadgeDollarSign,
  Download,
  Github,
  Loader2,
  RefreshCcw,
  SlidersHorizontal,
  UploadCloud,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { appEnv } from "./lib/env";
import { formatBytes, shortCommit } from "./lib/format";
import { loadPreferences, savePreferences } from "./features/processor/storage";
import {
  ExportFormat,
  processOptionsSchema,
  ProcessPreferences,
} from "./features/processor/types";
import { useProcessAudio } from "./features/processor/useProcessAudio";

const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Choose a non-empty audio file.")
  .refine(
    (file) => file.size <= 750 * 1024 * 1024,
    "Maximum upload size is 750 MB.",
  );

export function App() {
  const initialPreferences = useMemo(
    () => loadPreferences(appEnv.apiBaseUrl),
    [],
  );
  const [preferences, setPreferences] =
    useState<ProcessPreferences>(initialPreferences);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>(
    "episode-postline.mp3",
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const mutation = useProcessAudio({
    onSuccess: (result) => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      setDownloadUrl(result.url);
      setDownloadName(result.filename);
    },
  });

  const updatePreferences = (next: ProcessPreferences) => {
    setPreferences(next);
    savePreferences(next);
  };

  const selectedFileMeta = file
    ? `${file.name} · ${formatBytes(file.size)}`
    : "WAV, MP3, M4A, FLAC";
  const canProcess = Boolean(file) && !mutation.isPending;

  const selectFile = (nextFile: File | null) => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setFileError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    const parsed = fileSchema.safeParse(nextFile);
    if (!parsed.success) {
      setFile(null);
      setFileError(parsed.error.issues[0]?.message ?? "Invalid file.");
      return;
    }
    setFile(nextFile);
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
    const parsed = processOptionsSchema.safeParse(preferences);
    if (!parsed.success) {
      setFileError(parsed.error.issues[0]?.message ?? "Invalid settings.");
      return;
    }
    mutation.mutate({ file, options: parsed.data });
  };

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
            {fileError ? <p className="error-text">{fileError}</p> : null}

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
                      updatePreferences({
                        ...preferences,
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
                      updatePreferences({
                        ...preferences,
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
                      onClick={() =>
                        updatePreferences({ ...preferences, format })
                      }
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
                  checked={preferences.trimSilence}
                  onChange={(event) =>
                    updatePreferences({
                      ...preferences,
                      trimSilence: event.currentTarget.checked,
                    })
                  }
                />
                <span>Trim silence</span>
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

            <button
              className="primary-button"
              type="button"
              disabled={!canProcess}
              onClick={process}
            >
              {mutation.isPending ? (
                <Loader2
                  className="animate-spin"
                  aria-hidden="true"
                  size={18}
                />
              ) : (
                <Wand2 aria-hidden="true" size={18} />
              )}
              {mutation.isPending ? "Processing" : "Run postline"}
            </button>
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
                onClick={() => mutation.reset()}
                title="Reset status"
                disabled={mutation.isPending}
              >
                <RefreshCcw aria-hidden="true" size={18} />
              </button>
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
              {[
                "RNNoise denoise",
                "-16 LUFS normalize",
                "Silence trim",
                "FFmpeg export",
              ].map((stage, index) => (
                <li
                  key={stage}
                  className={
                    mutation.isPending || mutation.isSuccess ? "lit" : ""
                  }
                >
                  <span>{index + 1}</span>
                  {stage}
                </li>
              ))}
            </ol>

            {mutation.error ? (
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
