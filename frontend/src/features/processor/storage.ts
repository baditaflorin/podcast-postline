import { ProcessPreferences, processOptionsSchema } from "./types";
import { WorkspaceSnapshot, workspaceSnapshotSchema } from "./workspace";

const PREFERENCES_KEY = "podcast-postline.preferences.v1";
const WORKSPACE_KEY = "podcast-postline.workspace.v1";

export function loadPreferences(defaultApiBaseUrl: string): ProcessPreferences {
  const fallback = defaultPreferences(defaultApiBaseUrl);

  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
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

export function defaultPreferences(
  defaultApiBaseUrl: string,
): ProcessPreferences {
  return {
    apiBaseUrl: defaultApiBaseUrl,
    targetLufs: -16,
    format: "mp3",
    trimSilence: true,
    denoise: true,
    normalize: true,
    preserveStereo: false,
  };
}

export function savePreferences(preferences: ProcessPreferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function loadWorkspace(): WorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = workspaceSnapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveWorkspace(snapshot: WorkspaceSnapshot) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot));
}

export function clearWorkspace() {
  localStorage.removeItem(WORKSPACE_KEY);
}
