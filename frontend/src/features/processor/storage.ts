import { ProcessPreferences, processOptionsSchema } from "./types";

const KEY = "podcast-postline.preferences.v1";

export function loadPreferences(defaultApiBaseUrl: string): ProcessPreferences {
  const fallback: ProcessPreferences = {
    apiBaseUrl: defaultApiBaseUrl,
    targetLufs: -16,
    format: "mp3",
    trimSilence: true,
  };

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = processOptionsSchema.safeParse({
      ...fallback,
      ...JSON.parse(raw),
    });
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function savePreferences(preferences: ProcessPreferences) {
  localStorage.setItem(KEY, JSON.stringify(preferences));
}
