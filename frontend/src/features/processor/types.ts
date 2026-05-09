import { z } from "zod";

export const exportFormatSchema = z.enum(["mp3", "wav", "m4a"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export const exportFormats: ExportFormat[] = ["mp3", "wav", "m4a"];

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

export const issueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["warning", "blocker"]),
  message: z.string().min(1),
  why: z.string().min(1),
  next: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type Issue = z.infer<typeof issueSchema>;

export const mediaProfileSchema = z.object({
  id: z.string().optional(),
  original_name: z.string().min(1),
  size_bytes: z.number().nonnegative(),
  format: z.string(),
  mime: z.string(),
  duration_seconds: z.number().nonnegative(),
  channels: z.number().int().nonnegative(),
  sample_rate_hz: z.number().int().nonnegative(),
  bit_depth: z.number().int().nonnegative(),
  integrated_lufs: z.number(),
  peak_dbfs: z.number(),
  noise_floor_dbfs: z.number(),
  silence_ratio: z.number().min(0).max(1),
  speech_ratio: z.number().min(0).max(1),
  music_ratio: z.number().min(0).max(1),
  dc_offset: z.number().optional(),
  decode_state: z.string().min(1),
  fingerprint_sha256: z.string().optional(),
  notes: z.string().optional(),
});

export type MediaProfile = z.infer<typeof mediaProfileSchema>;

export const planOptionsSchema = z.object({
  target_lufs: z.number().min(-30).max(-6),
  format: exportFormatSchema,
  trim_silence: z.boolean(),
  denoise: z.boolean(),
  normalize: z.boolean(),
  preserve_stereo: z.boolean(),
});

export type PlanOptions = z.infer<typeof planOptionsSchema>;

export const processingPlanSchema = z.object({
  schema_version: z.string().min(1),
  plan_id: z.string().min(1),
  status: z.enum(["ready", "needs_review", "blocked"]),
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  profile: mediaProfileSchema,
  recommended: planOptionsSchema,
  warnings: z.array(issueSchema),
  anomalies: z.array(issueSchema),
  reasons: z.array(z.string()),
});

export type ProcessingPlan = z.infer<typeof processingPlanSchema>;

export const provenanceSchema = z.object({
  schema_version: z.string().min(1),
  app_version: z.string().min(1),
  commit: z.string().min(1),
  profile: mediaProfileSchema,
  plan_id: z.string().min(1),
  confidence: z.number().min(0).max(1),
  options: planOptionsSchema,
  warnings: z.array(issueSchema),
  anomalies: z.array(issueSchema),
  generated_at: z.string().min(1),
});

export type Provenance = z.infer<typeof provenanceSchema>;

export const domainErrorSchema = z.object({
  error: z.string().optional(),
  code: z.string().optional(),
  what: z.string().optional(),
  why: z.string().optional(),
  next: z.string().optional(),
  recoverable: z.boolean().optional(),
});

export type DomainError = z.infer<typeof domainErrorSchema>;
