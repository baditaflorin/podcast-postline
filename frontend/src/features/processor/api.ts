import {
  ProcessingPlan,
  ProcessAudioInput,
  ProcessAudioResult,
  Provenance,
  domainErrorSchema,
  processingPlanSchema,
  provenanceSchema,
} from "./types";

export async function preflightAudio({
  file,
  apiBaseUrl,
  targetLufs,
  signal,
}: {
  file: File;
  apiBaseUrl: string;
  targetLufs: number;
  signal?: AbortSignal;
}): Promise<ProcessingPlan> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("target_lufs", String(targetLufs));

  const endpoint = new URL("/api/preflight", normalizeBaseUrl(apiBaseUrl));
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }

  const body = await response.json();
  return parseProcessingPlan(body);
}

export async function processAudio({
  file,
  options,
  signal,
}: ProcessAudioInput): Promise<ProcessAudioResult> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("target_lufs", String(options.targetLufs));
  formData.set("format", options.format);
  formData.set("trim_silence", String(options.trimSilence));
  formData.set("denoise", String(options.denoise));
  formData.set("normalize", String(options.normalize));
  formData.set("preserve_stereo", String(options.preserveStereo));

  const endpoint = new URL(
    "/api/process",
    normalizeBaseUrl(options.apiBaseUrl),
  );
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }

  const blob = await response.blob();
  return {
    blob,
    url: URL.createObjectURL(blob),
    filename:
      filenameFromHeader(response.headers.get("Content-Disposition")) ??
      fallbackFilename(file.name, options.format),
    provenance: provenanceFromHeader(
      response.headers.get("X-Postline-Provenance"),
    ),
  };
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function filenameFromHeader(header: string | null) {
  if (!header) return null;
  const match =
    /filename="([^"]+)"/i.exec(header) ?? /filename=([^;]+)/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

function fallbackFilename(name: string, format: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${base || "episode"}-postline.${format}`;
}

async function responseMessage(response: Response) {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    const parsed = domainErrorSchema.safeParse(body);
    if (parsed.success) {
      const error = parsed.data;
      if (error.what && error.why && error.next) {
        return `${error.what}. ${error.why} ${error.next}`;
      }
      if (error.error) return error.error;
    }
  }
  return `Request failed with HTTP ${response.status}`;
}

function provenanceFromHeader(header: string | null): Provenance | null {
  if (!header) return null;
  try {
    const padded = header.padEnd(
      header.length + ((4 - (header.length % 4)) % 4),
      "=",
    );
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return provenanceSchema.parse(JSON.parse(json));
  } catch {
    return null;
  }
}

function parseProcessingPlan(value: unknown): ProcessingPlan {
  const parsed = processingPlanSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      "Preflight returned data this version cannot safely read. Refresh the app and try again.",
    );
  }
  return parsed.data;
}
