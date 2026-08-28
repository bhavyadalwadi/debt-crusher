import { describe, expect, it } from "vitest";
import { assertSameOrigin, readBoundedJson, SecurityError } from "@/lib/security";

describe("financial request boundary", () => {
  it("rejects missing and cross-origin mutation requests", () => {
    expect(() => assertSameOrigin(new Request("https://app.example/api/test", { method: "POST" }))).toThrow(SecurityError);
    expect(() => assertSameOrigin(new Request("https://app.example/api/test", { method: "POST", headers: { origin: "https://attacker.example" } }))).toThrow(SecurityError);
    expect(() => assertSameOrigin(new Request("https://app.example/api/test", { method: "POST", headers: { origin: "https://app.example" } }))).not.toThrow();
  });

  it("rejects unexpected content types and oversized bodies", async () => {
    await expect(readBoundedJson(new Request("https://app.example/api/test", { method: "POST", body: "{}" }))).rejects.toMatchObject({ status: 415 });
    await expect(readBoundedJson(new Request("https://app.example/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100) }),
    }), 32)).rejects.toMatchObject({ status: 413 });
  });
});
