import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  timeout: 20_000,
  expect: { timeout: 1500 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:8765", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: ".venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8765",
    cwd: root,
    env: { ATLAS_DB_PATH: `${root}/.tmp/atlas-browser-tests.sqlite3` },
    url: "http://127.0.0.1:8765/api/health",
    reuseExistingServer: false,
  },
});
