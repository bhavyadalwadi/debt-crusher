const SESSION_COOKIE_NAME = "debt_crusher_session";
const SESSION_TOKEN_VERSION = "v1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type RequiredEnvName =
  | "PRIVATE_ACCESS_USERNAME"
  | "PRIVATE_ACCESS_PASSWORD";

function requiredEnv(name: RequiredEnvName) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

async function sha256Hex(input: string) {
  return Array.from(await sha256(input))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function constantTimeEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);

  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < leftHash.length; i += 1) {
    diff |= leftHash[i] ^ rightHash[i];
  }
  return diff === 0;
}

async function getSessionSignature(payload: string) {
  const username = requiredEnv("PRIVATE_ACCESS_USERNAME");
  const password = requiredEnv("PRIVATE_ACCESS_PASSWORD");
  return sha256Hex(
    `debt-crusher:${SESSION_TOKEN_VERSION}:${payload}:${username}:${password}`,
  );
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function hasPrivateAccessCredentials() {
  return Boolean(
    process.env.PRIVATE_ACCESS_USERNAME && process.env.PRIVATE_ACCESS_PASSWORD,
  );
}

export function getMissingPrivateAccessMessage() {
  return "Missing PRIVATE_ACCESS_USERNAME or PRIVATE_ACCESS_PASSWORD";
}

export function sanitizeNextPath(next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${SESSION_TOKEN_VERSION}.${expiresAt}`;
  const signature = await getSessionSignature(payload);
  return `${payload}.${signature}`;
}

export async function isValidLogin(username: string, password: string) {
  const expectedUsername = requiredEnv("PRIVATE_ACCESS_USERNAME");
  const expectedPassword = requiredEnv("PRIVATE_ACCESS_PASSWORD");
  const [usernameMatches, passwordMatches] = await Promise.all([
    constantTimeEqual(username, expectedUsername),
    constantTimeEqual(password, expectedPassword),
  ]);
  return usernameMatches && passwordMatches;
}

export async function isValidSessionToken(token?: string) {
  if (!token) {
    return false;
  }

  const [version, expiresAtRaw, signature] = token.split(".");
  if (!version || !expiresAtRaw || !signature) {
    return false;
  }

  if (version !== SESSION_TOKEN_VERSION) {
    return false;
  }

  const expiresAt = Number.parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = await getSessionSignature(`${version}.${expiresAtRaw}`);
  return constantTimeEqual(signature, expectedSignature);
}
