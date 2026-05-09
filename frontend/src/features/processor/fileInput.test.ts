import { describe, expect, it } from "vitest";
import { classifyAudioFile, createDemoWavFile } from "./fileInput";

describe("audio input classification", () => {
  it("recognizes ordinary podcast audio files", () => {
    const file = new File(["audio"], "episode.mp3", { type: "audio/mpeg" });

    expect(classifyAudioFile(file)).toMatchObject({
      format: "mp3",
      confidence: 0.92,
      warning: null,
    });
  });

  it("flags MIME and extension mismatches without rejecting early", () => {
    const file = new File(["audio"], "episode.wav", { type: "audio/mpeg" });

    const finding = classifyAudioFile(file);

    expect(finding.format).toBe("wav");
    expect(finding.confidence).toBeLessThan(0.7);
    expect(finding.warning).toContain("extension says WAV");
  });

  it("creates a deterministic demo WAV input", () => {
    const file = createDemoWavFile();

    expect(file.name).toBe("postline-demo.wav");
    expect(file.type).toBe("audio/wav");
    expect(file.size).toBeGreaterThan(44);
  });
});
