import { afterEach, describe, expect, it } from "vitest";
import { resolveOwnerContext } from "@/lib/security";

const previousOwner = process.env.DEBT_CRUSHER_OWNER_CLERK_USER_ID;
afterEach(() => {
  process.env.DEBT_CRUSHER_OWNER_CLERK_USER_ID = previousOwner;
});

describe("owner authorization", () => {
  it("denies an unauthenticated request before database access", async () => {
    process.env.DEBT_CRUSHER_OWNER_CLERK_USER_ID = "user_owner";
    await expect(resolveOwnerContext({ clerkUserId: null })).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("denies every authenticated non-owner before database access", async () => {
    process.env.DEBT_CRUSHER_OWNER_CLERK_USER_ID = "user_owner";
    await expect(resolveOwnerContext({ clerkUserId: "user_attacker" })).rejects.toMatchObject({ status: 403, code: "OWNER_ONLY" });
  });
});
