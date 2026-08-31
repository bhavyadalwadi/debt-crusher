import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

setup.describe.configure({ mode: "serial" });

setup("configure Clerk testing", async () => {
  for (const name of ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "E2E_CLERK_OWNER_EMAIL"]) {
    if (!process.env[name]) throw new Error(`${name} is required for authenticated E2E tests.`);
  }
  if (!process.env.CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_")) {
    throw new Error("Authenticated E2E tests require a Clerk development publishable key.");
  }
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_test_")) {
    throw new Error("Authenticated E2E tests require a Clerk development secret key.");
  }
  await clerkSetup();
});

setup("authenticate the configured owner", async ({ page }) => {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_OWNER_EMAIL! });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toBeVisible();

  const authFile = path.resolve("playwright/.clerk/owner.json");
  await fs.mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
