const SESSION_COOKIE_NAME = "debt_crusher_session";

function requiredEnv(name: "BASIC_AUTH_USERNAME" | "BASIC_AUTH_PASSWORD") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export async function createSessionToken() {
  const username = requiredEnv("BASIC_AUTH_USERNAME");
  const password = requiredEnv("BASIC_AUTH_PASSWORD");
  return sha256Hex(`debt-crusher:${username}:${password}:v1`);
}

export async function isValidLogin(username: string, password: string) {
  return (
    username === requiredEnv("BASIC_AUTH_USERNAME") &&
    password === requiredEnv("BASIC_AUTH_PASSWORD")
  );
}

export async function isValidSessionToken(token?: string) {
  if (!token) {
    return false;
  }
  return token === (await createSessionToken());
}
