import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type TokenEnvelope = {
  tokenCiphertext: string;
  tokenIv: string;
  tokenTag: string;
  wrappedKey: string;
  wrappedKeyIv: string;
  wrappedKeyTag: string;
  tokenKeyVersion: string;
};

type KeyResolver = (version: string) => Buffer;

const encode = (value: Buffer) => value.toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url");
const TOKEN_AAD = Buffer.from("debt-crusher:plaid-token:envelope-v1");

function envKey(version: string) {
  const name = `FINANCIAL_TOKEN_KEK_${version.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const raw = process.env[name];
  if (!raw) throw new Error("Financial token encryption is not configured.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Financial token encryption key must be 32 bytes.");
  return key;
}

function encryptAesGcm(plaintext: Buffer, key: Buffer, aad: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, iv, tag: cipher.getAuthTag() };
}

function decryptAesGcm(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer, aad: Buffer) {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptFinancialToken(
  token: string,
  version = process.env.FINANCIAL_TOKEN_KEY_VERSION || "v1",
  resolveKey: KeyResolver = envKey,
): TokenEnvelope {
  const dataKey = randomBytes(32);
  const wrapAad = Buffer.from(`debt-crusher:wrapped-key:${version}`);
  const encryptedToken = encryptAesGcm(Buffer.from(token, "utf8"), dataKey, TOKEN_AAD);
  const encryptedKey = encryptAesGcm(dataKey, resolveKey(version), wrapAad);
  dataKey.fill(0);
  return {
    tokenCiphertext: encode(encryptedToken.ciphertext),
    tokenIv: encode(encryptedToken.iv),
    tokenTag: encode(encryptedToken.tag),
    wrappedKey: encode(encryptedKey.ciphertext),
    wrappedKeyIv: encode(encryptedKey.iv),
    wrappedKeyTag: encode(encryptedKey.tag),
    tokenKeyVersion: version,
  };
}

export function decryptFinancialToken(envelope: TokenEnvelope, resolveKey: KeyResolver = envKey) {
  const version = envelope.tokenKeyVersion;
  const dataKey = decryptAesGcm(
    decode(envelope.wrappedKey),
    resolveKey(version),
    decode(envelope.wrappedKeyIv),
    decode(envelope.wrappedKeyTag),
    Buffer.from(`debt-crusher:wrapped-key:${version}`),
  );
  try {
    return decryptAesGcm(
      decode(envelope.tokenCiphertext),
      dataKey,
      decode(envelope.tokenIv),
      decode(envelope.tokenTag),
      TOKEN_AAD,
    ).toString("utf8");
  } finally {
    dataKey.fill(0);
  }
}

export function rewrapFinancialToken(envelope: TokenEnvelope, nextVersion: string, resolveKey: KeyResolver = envKey) {
  const dataKey = decryptAesGcm(
    decode(envelope.wrappedKey),
    resolveKey(envelope.tokenKeyVersion),
    decode(envelope.wrappedKeyIv),
    decode(envelope.wrappedKeyTag),
    Buffer.from(`debt-crusher:wrapped-key:${envelope.tokenKeyVersion}`),
  );
  try {
    const wrapped = encryptAesGcm(
      dataKey,
      resolveKey(nextVersion),
      Buffer.from(`debt-crusher:wrapped-key:${nextVersion}`),
    );
    return {
      ...envelope,
      wrappedKey: encode(wrapped.ciphertext),
      wrappedKeyIv: encode(wrapped.iv),
      wrappedKeyTag: encode(wrapped.tag),
      tokenKeyVersion: nextVersion,
    };
  } finally {
    dataKey.fill(0);
  }
}
