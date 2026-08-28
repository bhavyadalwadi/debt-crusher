import { PrismaClient } from "@prisma/client";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const nextVersion = process.argv[2]?.trim();
if (!nextVersion || !/^[a-zA-Z0-9_-]{1,32}$/.test(nextVersion)) {
  console.error("Usage: npm run security:rotate-token-key -- <new-version>");
  process.exit(2);
}

const decode = (value) => Buffer.from(value, "base64url");
const encode = (value) => value.toString("base64url");

function keyFor(version) {
  const envName = `FINANCIAL_TOKEN_KEK_${version.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const raw = process.env[envName];
  const key = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (key.length !== 32) throw new Error(`Missing 32-byte base64 key in ${envName}.`);
  return key;
}

function unwrap(connection) {
  const decipher = createDecipheriv("aes-256-gcm", keyFor(connection.tokenKeyVersion), decode(connection.wrappedKeyIv));
  decipher.setAAD(Buffer.from(`debt-crusher:wrapped-key:${connection.tokenKeyVersion}`));
  decipher.setAuthTag(decode(connection.wrappedKeyTag));
  return Buffer.concat([decipher.update(decode(connection.wrappedKey)), decipher.final()]);
}

function wrap(dataKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(nextVersion), iv);
  cipher.setAAD(Buffer.from(`debt-crusher:wrapped-key:${nextVersion}`));
  const wrappedKey = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  return { wrappedKey: encode(wrappedKey), wrappedKeyIv: encode(iv), wrappedKeyTag: encode(cipher.getAuthTag()) };
}

const prisma = new PrismaClient();
try {
  keyFor(nextVersion);
  const connections = await prisma.financialConnection.findMany({
    where: { tokenCiphertext: { not: null }, tokenKeyVersion: { not: nextVersion } },
    select: { id: true, tokenKeyVersion: true, wrappedKey: true, wrappedKeyIv: true, wrappedKeyTag: true },
  });
  let rotated = 0;
  for (const connection of connections) {
    if (!connection.tokenKeyVersion || !connection.wrappedKey || !connection.wrappedKeyIv || !connection.wrappedKeyTag) {
      throw new Error(`Connection ${connection.id} has an incomplete key envelope.`);
    }
    const dataKey = unwrap(connection);
    try {
      const replacement = wrap(dataKey);
      await prisma.financialConnection.update({
        where: { id: connection.id },
        data: { ...replacement, tokenKeyVersion: nextVersion },
      });
      rotated += 1;
    } finally {
      dataKey.fill(0);
    }
  }
  console.log(`Rewrapped ${rotated} financial token data key(s) to ${nextVersion}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Key rotation failed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
