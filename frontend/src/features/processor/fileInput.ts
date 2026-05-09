export type AudioInputFinding = {
  format: string;
  confidence: number;
  warning: string | null;
};

const audioExtensions = new Map([
  ["mp3", "audio/mpeg"],
  ["wav", "audio/wav"],
  ["m4a", "audio/mp4"],
  ["flac", "audio/flac"],
  ["aac", "audio/aac"],
  ["ogg", "audio/ogg"],
]);

export function classifyAudioFile(file: File): AudioInputFinding {
  const extension = extensionFromName(file.name);
  const expectedMime = extension ? audioExtensions.get(extension) : undefined;
  const browserMime = file.type.trim().toLowerCase();
  const format = extension || mimeToFormat(browserMime) || "audio";

  if (!extension && !browserMime.startsWith("audio/")) {
    return {
      format,
      confidence: 0.35,
      warning:
        "This file has no audio extension or browser audio type. The backend will inspect it before processing.",
    };
  }

  if (expectedMime && browserMime && !mimeMatches(browserMime, expectedMime)) {
    return {
      format,
      confidence: 0.62,
      warning: `The file extension says ${extension.toUpperCase()}, but the browser reports ${browserMime}. Preflight will verify the recording.`,
    };
  }

  if (!audioExtensions.has(format) && browserMime.startsWith("audio/")) {
    return {
      format,
      confidence: 0.58,
      warning: `The browser reports ${browserMime}, which may need backend decoder support.`,
    };
  }

  return { format, confidence: 0.92, warning: null };
}

export function audioFilesFromList(files: FileList | File[]): File[] {
  return Array.from(files).filter((file) => {
    const extension = extensionFromName(file.name);
    return file.type.startsWith("audio/") || audioExtensions.has(extension);
  });
}

export function filesFromPaste(event: ClipboardEvent): File[] {
  if (!event.clipboardData) return [];
  return audioFilesFromList(event.clipboardData.files);
}

export async function readClipboardAudioFiles(): Promise<File[]> {
  if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") {
    throw new Error(
      "Clipboard file reading is not available in this browser. Use paste, drag/drop, or the file picker.",
    );
  }

  const items = await navigator.clipboard.read();
  const files: File[] = [];
  for (const item of items) {
    for (const type of item.types) {
      if (!type.startsWith("audio/")) continue;
      const blob = await item.getType(type);
      files.push(
        new File([blob], `clipboard-audio.${mimeToFormat(type) || "audio"}`, {
          type,
          lastModified: Date.now(),
        }),
      );
    }
  }

  if (files.length === 0) {
    throw new Error(
      "The clipboard did not contain an audio file. Copy an audio file, or use drag/drop.",
    );
  }
  return files;
}

export function createDemoWavFile(): File {
  const sampleRate = 16_000;
  const seconds = 1.2;
  const samples = Math.floor(sampleRate * seconds);
  const dataBytes = samples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples; i += 1) {
    const envelope = Math.sin((Math.PI * i) / samples);
    const carrier = Math.sin((2 * Math.PI * 220 * i) / sampleRate);
    const sample = Math.round(carrier * envelope * 0.22 * 32767);
    view.setInt16(44 + i * 2, sample, true);
  }

  return new File([buffer], "postline-demo.wav", {
    type: "audio/wav",
    lastModified: 1_735_689_600_000,
  });
}

export function stableFileId(file: File, existingIds: Set<string>): string {
  const base = `${sanitize(file.name)}-${file.size}-${file.lastModified || 0}`;
  let candidate = base || `audio-${file.size}`;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function extensionFromName(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match?.[1]?.toLowerCase() ?? "";
}

function mimeToFormat(mime: string): string {
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("aac")) return "m4a";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("ogg")) return "ogg";
  return "";
}

function mimeMatches(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  if (expected === "audio/wav" && actual === "audio/x-wav") return true;
  if (expected === "audio/mp4" && actual === "audio/x-m4a") return true;
  if (expected === "audio/mpeg" && actual === "audio/mp3") return true;
  return false;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "");
}
