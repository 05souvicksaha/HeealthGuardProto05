import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  timeout: 180_000,
  workers: 1,
  reporter: "list",
  outputDir: resolve(process.env.TEMP ?? ".", "healthguard-isolated-results"),
  use: { baseURL: "http://127.0.0.1:5501", channel: "msedge", viewport: { width: 1440, height: 900 }, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "node e2e/serve-isolated.mjs", cwd: resolve(import.meta.dirname, ".."), url: "http://127.0.0.1:5501/login", reuseExistingServer: false, timeout: 120_000 }
});
