import {defineConfig, devices} from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.mjs",
  workers: 1,
  retries: 1,
  timeout: 45000,
  expect: {timeout: 12000},
  reporter: process.env.CI ? "list" : "line",
  use: {baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure"},
  projects: [
    {name: "desktop-chromium", use: {...devices["Desktop Chrome"]}},
    {name: "mobile-chromium-emulation", use: {...devices["Pixel 7"]}}
  ],
  webServer: {
    command: "node tests/serve.mjs",
    url: "http://127.0.0.1:4175/",
    reuseExistingServer: !process.env.CI,
    timeout: 10000
  }
});
