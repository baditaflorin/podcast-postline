import { z } from "zod";

const envSchema = z.object({
  apiBaseUrl: z.string().url(),
  version: z.string().min(1),
  commit: z.string().min(1),
  repoUrl: z.string().url(),
  paypalUrl: z.string().url(),
});

export const appEnv = envSchema.parse({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  version: import.meta.env.VITE_APP_VERSION ?? "0.3.0",
  commit: import.meta.env.VITE_GIT_COMMIT ?? "dev",
  repoUrl:
    import.meta.env.VITE_REPO_URL ??
    "https://github.com/baditaflorin/podcast-postline",
  paypalUrl:
    import.meta.env.VITE_PAYPAL_URL ??
    "https://www.paypal.com/paypalme/florinbadita",
});
