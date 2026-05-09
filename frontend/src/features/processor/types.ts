import { z } from "zod";

export const exportFormatSchema = z.enum(["mp3", "wav", "m4a"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const processOptionsSchema = z.object({
  apiBaseUrl: z.string().url(),
  targetLufs: z.number().min(-30).max(-6),
  format: exportFormatSchema,
  trimSilence: z.boolean(),
  denoise: z.boolean(),
  normalize: z.boolean(),
  preserveStereo: z.boolean(),
});

export type ProcessPreferences = z.infer<typeof processOptionsSchema>;

export type ProcessAudioInput = {
  file: File;
  options: ProcessPreferences;
  signal?: AbortSignal;
};

export type ProcessAudioResult = {
  blob: Blob;
  url: string;
  filename: string;
  provenance: Provenance | null;
};

export type Issue = {
  code: string;
  severity: "warning" | "blocker" | string;
  message: string;
  why: string;
  next: string;
  confidence: number;
};

export type MediaProfile = {
  id?: string;
  original_name: string;
  size_bytes: number;
  format: string;
  mime: string;
  duration_seconds: number;
  channels: number;
  sample_rate_hz: number;
  bit_depth: number;
  integrated_lufs: number;
  peak_dbfs: number;
  noise_floor_dbfs: number;
  silence_ratio: number;
  speech_ratio: number;
  music_ratio: number;
  dc_offset?: number;
  decode_state: string;
  fingerprint_sha256?: string;
  notes?: string;
};

export type PlanOptions = {
  target_lufs: number;
  format: ExportFormat;
  trim_silence: boolean;
  denoise: boolean;
  normalize: boolean;
  preserve_stereo: boolean;
};

export type ProcessingPlan = {
  schema_version: string;
  plan_id: string;
  status: "ready" | "needs_review" | "blocked";
  label: string;
  confidence: number;
  profile: MediaProfile;
  recommended: PlanOptions;
  warnings: Issue[];
  anomalies: Issue[];
  reasons: string[];
};

export type Provenance = {
  schema_version: string;
  app_version: string;
  commit: string;
  profile: MediaProfile;
  plan_id: string;
  confidence: number;
  options: {
    target_lufs: number;
    format: string;
    trim_silence: boolean;
    denoise: boolean;
    normalize: boolean;
    preserve_stereo: boolean;
  };
  warnings: Issue[];
  anomalies: Issue[];
  generated_at: string;
};

export type DomainError = {
  error: string;
  code?: string;
  what?: string;
  why?: string;
  next?: string;
  recoverable?: boolean;
};
