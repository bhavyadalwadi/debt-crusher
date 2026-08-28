import { describe, expect, it } from "vitest";
import { decryptFinancialToken, encryptFinancialToken, rewrapFinancialToken } from "@/lib/token-envelope";

const keys = {
  v1: Buffer.alloc(32, 17),
  v2: Buffer.alloc(32, 29),
};
const resolveKey = (version: string) => keys[version as keyof typeof keys];

describe("financial token envelope", () => {
  it("encrypts and decrypts with independent token and wrapping ciphertext", () => {
    const envelope = encryptFinancialToken("access-sandbox-sensitive", "v1", resolveKey);
    expect(envelope.tokenCiphertext).not.toContain("access-sandbox-sensitive");
    expect(envelope.wrappedKey).not.toBe(envelope.tokenCiphertext);
    expect(decryptFinancialToken(envelope, resolveKey)).toBe("access-sandbox-sensitive");
  });

  it("rejects tampering", () => {
    const envelope = encryptFinancialToken("access-sandbox-sensitive", "v1", resolveKey);
    const tamperedTag = `${envelope.tokenTag[0] === "A" ? "B" : "A"}${envelope.tokenTag.slice(1)}`;
    expect(() => decryptFinancialToken({ ...envelope, tokenTag: tamperedTag }, resolveKey)).toThrow();
  });

  it("rewraps only the data key and preserves token ciphertext", () => {
    const original = encryptFinancialToken("access-sandbox-sensitive", "v1", resolveKey);
    const rotated = rewrapFinancialToken(original, "v2", resolveKey);
    expect(rotated.tokenCiphertext).toBe(original.tokenCiphertext);
    expect(rotated.tokenIv).toBe(original.tokenIv);
    expect(rotated.tokenTag).toBe(original.tokenTag);
    expect(rotated.wrappedKey).not.toBe(original.wrappedKey);
    expect(decryptFinancialToken(rotated, resolveKey)).toBe("access-sandbox-sensitive");
  });
});
