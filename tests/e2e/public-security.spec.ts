import { expect, test } from "@playwright/test";

test("anonymous users are sent to the owner sign-in page and cannot self-register", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);

  await page.goto("/sign-up");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("security headers protect the sign-in surface", async ({ request }) => {
  const response = await request.get("/sign-in");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
});

test("the public Plaid webhook rejects unsigned requests without redirecting", async ({ request }) => {
  const response = await request.post("/api/plaid/webhook", {
    data: { webhook_type: "ITEM", webhook_code: "TEST" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["location"]).toBeUndefined();
  expect(response.headers()["cache-control"]).toContain("no-store");
});
