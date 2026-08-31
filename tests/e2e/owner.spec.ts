import { expect, test } from "@playwright/test";

test("the owner can load private financial APIs with no-store responses", async ({ request }) => {
  const response = await request.get("/api/portfolio");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const payload = await response.json();
  expect(payload).toHaveProperty("portfolio");
});

test("the owner can navigate every critical read-only workspace", async ({ page }) => {
  await page.goto("/");
  for (const view of ["Setup", "Monthly Review", "Credit Cards", "Cash Accounts", "Bank Sync", "Utilities"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`view=${view.toLowerCase().replaceAll(" ", "-")}`));
  }
});

test("the retired sign-up route always returns the owner to sign-in", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page).toHaveURL(/\/sign-in/);
});
