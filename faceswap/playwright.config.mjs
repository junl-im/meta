import {defineConfig, devices} from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.mjs",
  workers: 1,
  retries: 0,
  timeout: 25000,
  expect: {timeout: 8000},
  reporter: process.env.CI ? "list" : "line",
  use: {baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure"},
  projects: [
    {name: "desktop-chromium", testMatch: "**/local-render.spec.mjs",
      use: {...devices["Desktop Chrome"]}},
    {name: "mobile-chromium-emulation", testMatch: "**/local-render.spec.mjs",
      use: {...devices["Pixel 7"]}},
    {name: "desktop-firefox", testMatch: "**/browser-compat.spec.mjs",
      use: {...devices["Desktop Firefox"]}},
    {name: "mobile-webkit-emulation", testMatch: "**/browser-compat.spec.mjs",
      use: {...devices["iPhone 13"]}}
  ],
  webServer: {
    command: "node tests/serve.mjs",
    url: "http://127.0.0.1:4175/",
    reuseExistingServer: !process.env.CI,
    timeout: 10000
  }
});
