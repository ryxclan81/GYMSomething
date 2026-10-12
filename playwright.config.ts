import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const windowsChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const executablePath =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  (process.platform === "win32" && existsSync(windowsChrome)
    ? windowsChrome
    : undefined);
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { executablePath },
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
