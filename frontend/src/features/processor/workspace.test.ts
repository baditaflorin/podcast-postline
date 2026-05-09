import { describe, expect, it } from "vitest";
import {
  createWorkspaceSnapshot,
  decodeWorkspaceHash,
  encodeWorkspaceHash,
  parseWorkspace,
  stableWorkspaceJson,
} from "./workspace";
import { ProcessPreferences } from "./types";

const preferences: ProcessPreferences = {
  apiBaseUrl: "http://localhost:8080",
  targetLufs: -16,
  format: "mp3",
  trimSilence: true,
  denoise: true,
  normalize: true,
  preserveStereo: false,
};

describe("workspace snapshots", () => {
  it("round-trips through JSON and hash encoding", () => {
    const snapshot = createWorkspaceSnapshot({
      appVersion: "0.3.0",
      commit: "abc1234",
      preferences,
      selectedJobId: "episode-1",
      jobs: [
        {
          id: "episode-1",
          name: "episode.wav",
          size: 1024,
          type: "audio/wav",
          lastModified: 1,
          formatGuess: "wav",
          confidence: 0.92,
          status: "ready",
          warning: null,
          error: null,
          plan: null,
          provenance: null,
        },
      ],
      sessionOverrides: { format: "mp3" },
      activity: [
        { id: "1", at: "2026-05-10T00:00:00.000Z", message: "Added." },
      ],
      now: new Date("2026-05-10T00:00:00.000Z"),
    });

    const parsed = parseWorkspace(JSON.parse(stableWorkspaceJson(snapshot)));
    const decoded = decodeWorkspaceHash(`#${encodeWorkspaceHash(snapshot)}`);

    expect(parsed).toEqual(snapshot);
    expect(decoded).toEqual(snapshot);
  });

  it("rejects unknown workspace shapes", () => {
    expect(() => parseWorkspace({ schema_version: "old" })).toThrow();
  });
});
