import { z } from "zod";

export const exportFormatSchema = z.enum(["mp3", "wav", "m4a"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const processOptionsSchema = z.object({
  apiBaseUrl: z.string().url(),
  targetLufs: z.number().min(-30).max(-6),
  format: exportFormatSchema,
  trimSilence: z.boolean(),
});

export type ProcessPreferences = z.infer<typeof processOptionsSchema>;

export type ProcessAudioInput = {
  file: File;
  options: ProcessPreferences;
};

export type ProcessAudioResult = {
  blob: Blob;
  url: string;
  filename: string;
};
