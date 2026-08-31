import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test("an authenticated non-owner is denied before portfolio access", async ({ page }) => {
  test.skip(!process.env.E2E_CLERK_NON_OWNER_EMAIL, "Set E2E_CLERK_NON_OWNER_EMAIL to run the outsider-denial gate.");
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_NON_OWNER_EMAIL! });

  const response = await page.request.get("/api/portfolio");
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ code: "OWNER_ONLY" });

  const dashboard = await page.goto("/");
  expect(dashboard?.status()).toBe(404);
});
