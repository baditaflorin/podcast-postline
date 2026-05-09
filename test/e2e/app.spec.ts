import { expect, test } from "@playwright/test";

const preflightPlan = {
  schema_version: "phase2.media-profile.v1",
  plan_id: "plan-e2e",
  status: "ready",
  label: "Normalize clean speech",
  confidence: 0.9,
  profile: {
    id: "sha256-e2e",
    original_name: "episode.wav",
    size_bytes: 48,
    format: "wav",
    mime: "audio/wav",
    duration_seconds: 1.2,
    channels: 1,
    sample_rate_hz: 16000,
    bit_depth: 16,
    integrated_lufs: -21,
    peak_dbfs: -4,
    noise_floor_dbfs: -60,
    silence_ratio: 0.05,
    speech_ratio: 0.9,
    music_ratio: 0,
    decode_state: "ok",
    fingerprint_sha256: "e2e",
  },
  recommended: {
    target_lufs: -16,
    format: "mp3",
    trim_silence: true,
    denoise: true,
    normalize: true,
    preserve_stereo: false,
  },
  warnings: [],
  anomalies: [],
  reasons: ["Default podcast target is -16 LUFS."],
};

const provenance = {
  schema_version: "phase2.provenance.v1",
  app_version: "0.3.0",
  commit: "e2e",
  profile: preflightPlan.profile,
  plan_id: preflightPlan.plan_id,
  confidence: preflightPlan.confidence,
  options: preflightPlan.recommended,
  warnings: [],
  anomalies: [],
  generated_at: "2026-05-10T00:00:00Z",
};

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:8080/api/preflight", async (route) => {
    await route.fulfill({ json: preflightPlan });
  });
  await page.route("http://localhost:8080/api/process", async (route) => {
    await route.fulfill({
      body: "stub audio",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers":
          "Content-Disposition, X-Postline-Provenance",
        "Content-Disposition": 'attachment; filename="episode-postline.mp3"',
        "Content-Type": "audio/mpeg",
        "X-Postline-Provenance": Buffer.from(
          JSON.stringify(provenance),
        ).toString("base64url"),
      },
    });
  });
});

test("loads processing app with project links and build metadata", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Post-production line" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/baditaflorin/podcast-postline",
  );
  await expect(page.getByRole("link", { name: "PayPal" })).toHaveAttribute(
    "href",
    "https://www.paypal.com/paypalme/florinbadita",
  );
  await expect(page.getByText(/^v0\.[23]\.0$/)).toBeVisible();
  await expect(page.getByText(/^commit /)).toBeVisible();
});

test("loads a generated sample and exports workspace state", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Sample" }).click();

  await expect(
    page.getByRole("button", { name: /postline-demo\.wav Ready/ }),
  ).toBeVisible();
  await expect(page.getByText("Normalize clean speech")).toBeVisible();
  await expect(page.getByText("1 recording(s)", { exact: true })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download state" }).click();
  expect((await download).suggestedFilename()).toContain(".postline.json");
});

test("queues multiple uploaded recordings", async ({ page }) => {
  await page.goto("/");

  await page.locator('input[type="file"][accept*="audio"]').setInputFiles([
    {
      name: "first.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("first"),
    },
    {
      name: "second.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("second"),
    },
  ]);

  await expect(page.getByText("2 recording(s)", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /first\.wav Ready/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /second\.mp3 Queued/ }),
  ).toBeVisible();
});

test("creates share links for small workspace state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sample" }).click();
  await expect(page.getByText("Normalize clean speech")).toBeVisible();

  await page.getByRole("button", { name: "Share state" }).click();

  await expect(page).toHaveURL(/#postline=/);
});

test("imports workspace state and starts fresh", async ({ page }) => {
  await page.goto("/");

  await page.locator('input[accept*=".postline.json"]').setInputFiles({
    name: "imported.postline.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schema_version: "phase3.workspace.v1",
        exported_at: "2026-05-10T00:00:00.000Z",
        app_version: "0.3.0",
        commit: "e2e",
        preferences: {
          apiBaseUrl: "http://localhost:8080",
          targetLufs: -16,
          format: "mp3",
          trimSilence: true,
          denoise: true,
          normalize: true,
          preserveStereo: false,
        },
        selected_job_id: "imported",
        jobs: [
          {
            id: "imported",
            name: "imported.wav",
            size: 2048,
            type: "audio/wav",
            last_modified: 1,
            format_guess: "wav",
            confidence: 0.92,
            status: "ready",
            warning: null,
            error: null,
            plan: null,
            provenance: null,
          },
        ],
        session_overrides: {},
        activity: [],
      }),
    ),
  });

  await expect(page.getByText("Reattach original audio files")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Recording queue" })
      .getByRole("button", { name: /imported\.wav Reattach audio/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Start fresh" }).click();

  await expect(page.getByText("Waiting for audio")).toBeVisible();
  await expect(page.getByText("imported.wav")).toHaveCount(0);
});

test("processes an active recording and exposes provenance actions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sample" }).click();
  await expect(page.getByText("Normalize clean speech")).toBeVisible();

  await page.getByRole("button", { name: "Run postline" }).click();

  await expect(
    page.getByRole("link", { name: /Download episode-postline\.mp3/ }),
  ).toBeVisible();
  await expect(page.getByText("Export provenance")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy JSON" })).toBeEnabled();
});
