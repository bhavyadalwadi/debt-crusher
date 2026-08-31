import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalBaseUrl ? undefined : {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "public",
      testMatch: /public-security\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "clerk-setup",
      testMatch: /clerk\.setup\.ts/,
    },
    {
      name: "owner",
      testMatch: /(^|\/)owner\.spec\.ts$/,
      dependencies: ["clerk-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.clerk/owner.json",
      },
    },
    {
      name: "non-owner",
      testMatch: /(^|\/)non-owner\.spec\.ts$/,
      dependencies: ["clerk-setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
