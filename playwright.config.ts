import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5500",
    channel: process.platform === "win32" ? "msedge" : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 }
  },
  webServer: [
    { command: "npm run dev:server", url: "http://127.0.0.1:4174/api/v1/health", reuseExistingServer: true, timeout: 120_000 },
    { command: "npm run dev:web", url: "http://127.0.0.1:5500/login", reuseExistingServer: true, timeout: 120_000 }
  ]
});
