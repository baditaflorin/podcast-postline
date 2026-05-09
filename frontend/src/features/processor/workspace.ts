import { z } from "zod";
import {
  ProcessingPlan,
  ProcessPreferences,
  Provenance,
  exportFormatSchema,
  processingPlanSchema,
  processOptionsSchema,
  provenanceSchema,
} from "./types";

export const workspaceSchemaVersion = "phase3.workspace.v1";

export const jobSnapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  type: z.string(),
  last_modified: z.number().nonnegative(),
  format_guess: z.string(),
  confidence: z.number().min(0).max(1),
  status: z.string().min(1),
  warning: z.string().nullable(),
  error: z.string().nullable(),
  plan: processingPlanSchema.nullable(),
  provenance: provenanceSchema.nullable(),
});

export type JobSnapshot = z.infer<typeof jobSnapshotSchema>;

export const activityEntrySchema = z.object({
  id: z.string().min(1),
  at: z.string().min(1),
  message: z.string().min(1),
});

export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const workspaceSnapshotSchema = z.object({
  schema_version: z.literal(workspaceSchemaVersion),
  exported_at: z.string().min(1),
  app_version: z.string().min(1),
  commit: z.string().min(1),
  preferences: processOptionsSchema,
  selected_job_id: z.string().nullable(),
  jobs: z.array(jobSnapshotSchema).max(50),
  session_overrides: z
    .object({
      targetLufs: z.number().optional(),
      format: exportFormatSchema.optional(),
      trimSilence: z.boolean().optional(),
      denoise: z.boolean().optional(),
      normalize: z.boolean().optional(),
      preserveStereo: z.boolean().optional(),
    })
    .partial(),
  activity: z.array(activityEntrySchema).max(100),
});

export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>;

export type SnapshotJobInput = {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  formatGuess: string;
  confidence: number;
  status: string;
  warning: string | null;
  error: string | null;
  plan: ProcessingPlan | null;
  provenance: Provenance | null;
};

export function createWorkspaceSnapshot({
  appVersion,
  commit,
  preferences,
  selectedJobId,
  jobs,
  sessionOverrides,
  activity,
  now,
}: {
  appVersion: string;
  commit: string;
  preferences: ProcessPreferences;
  selectedJobId: string | null;
  jobs: SnapshotJobInput[];
  sessionOverrides: Partial<Omit<ProcessPreferences, "apiBaseUrl">>;
  activity: ActivityEntry[];
  now?: Date;
}): WorkspaceSnapshot {
  return {
    schema_version: workspaceSchemaVersion,
    exported_at: (now ?? new Date()).toISOString(),
    app_version: appVersion,
    commit,
    preferences,
    selected_job_id: selectedJobId,
    jobs: jobs.map((job) => ({
      id: job.id,
      name: job.name,
      size: job.size,
      type: job.type,
      last_modified: job.lastModified,
      format_guess: job.formatGuess,
      confidence: job.confidence,
      status: job.status,
      warning: job.warning,
      error: job.error,
      plan: job.plan,
      provenance: job.provenance,
    })),
    session_overrides: sessionOverrides,
    activity,
  };
}

export function parseWorkspace(value: unknown): WorkspaceSnapshot {
  return workspaceSnapshotSchema.parse(value);
}

export function encodeWorkspaceHash(snapshot: WorkspaceSnapshot): string {
  return `postline=${base64UrlEncode(JSON.stringify(snapshot))}`;
}

export function decodeWorkspaceHash(hash: string): WorkspaceSnapshot | null {
  const trimmed = hash.replace(/^#/, "");
  if (!trimmed.startsWith("postline=")) return null;
  const encoded = trimmed.slice("postline=".length);
  if (!encoded) return null;
  return parseWorkspace(JSON.parse(base64UrlDecode(encoded)));
}

export function stableWorkspaceJson(snapshot: WorkspaceSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function workspaceFilename(snapshot: WorkspaceSnapshot): string {
  const firstJob =
    snapshot.jobs[0]?.name.replace(/\.[^.]+$/, "") || "workspace";
  const safe = firstJob.replace(/[^a-zA-Z0-9._-]+/g, "-") || "workspace";
  return `${safe}.postline.json`;
}

function base64UrlEncode(value: string): string {
  return btoa(utf8ToBinary(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  return binaryToUtf8(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
}

function utf8ToBinary(value: string): string {
  return encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function binaryToUtf8(value: string): string {
  return decodeURIComponent(
    Array.from(value)
      .map(
        (character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
      )
      .join(""),
  );
}
