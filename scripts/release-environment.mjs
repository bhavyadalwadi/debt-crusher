const PLACEHOLDER_PATTERN = /replace|your-|example(?:\.|$)|changeme|todo/i;

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function usable(value) {
  return present(value) && !PLACEHOLDER_PATTERN.test(value);
}

function isHttpsUrl(value, requiredPath) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (!requiredPath || url.pathname === requiredPath);
  } catch {
    return false;
  }
}

function decodedBase64Bytes(value) {
  try {
    return Buffer.from(value, "base64").length;
  } catch {
    return 0;
  }
}

export function validateReleaseEnvironment(target, env = process.env) {
  if (target !== "staging" && target !== "production") {
    return ["Target must be either staging or production."];
  }

  const errors = [];
  const requireValue = (name) => {
    if (!usable(env[name])) errors.push(`${name} is missing or still contains a placeholder.`);
  };

  for (const name of [
    "DATABASE_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
    "DEBT_CRUSHER_OWNER_CLERK_USER_ID",
    "SECURITY_HASH_KEY",
  ]) requireValue(name);

  if (usable(env.DATABASE_URL) && !/^postgres(?:ql)?:\/\//i.test(env.DATABASE_URL)) {
    errors.push("DATABASE_URL must use a dedicated PostgreSQL/Neon database for hosted releases.");
  }
  if (env.NEXT_PUBLIC_CLERK_SIGN_IN_URL !== "/sign-in") {
    errors.push("NEXT_PUBLIC_CLERK_SIGN_IN_URL must be /sign-in.");
  }
  if (usable(env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL) && !isHttpsUrl(env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL)) {
    errors.push("NEXT_PUBLIC_CLERK_FRONTEND_API_URL must be an exact HTTPS origin.");
  }
  if (usable(env.DEBT_CRUSHER_OWNER_CLERK_USER_ID) && !env.DEBT_CRUSHER_OWNER_CLERK_USER_ID.startsWith("user_")) {
    errors.push("DEBT_CRUSHER_OWNER_CLERK_USER_ID must be a Clerk user_ identifier.");
  }
  if (usable(env.SECURITY_HASH_KEY) && env.SECURITY_HASH_KEY.length < 64) {
    errors.push("SECURITY_HASH_KEY must contain at least 32 random bytes (64 hex characters recommended).");
  }

  const publishablePrefix = target === "staging" ? "pk_test_" : "pk_live_";
  const secretPrefix = target === "staging" ? "sk_test_" : "sk_live_";
  if (usable(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith(publishablePrefix)) {
    errors.push(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must use ${publishablePrefix} for ${target}.`);
  }
  if (usable(env.CLERK_SECRET_KEY) && !env.CLERK_SECRET_KEY.startsWith(secretPrefix)) {
    errors.push(`CLERK_SECRET_KEY must use ${secretPrefix} for ${target}.`);
  }

  const plaidNames = [
    "PLAID_CLIENT_ID",
    "PLAID_SECRET",
    "PLAID_WEBHOOK_URL",
    "FINANCIAL_TOKEN_KEY_VERSION",
    "FINANCIAL_TOKEN_KEK_V1",
  ];
  const plaidConfigured = plaidNames.some((name) => present(env[name])) || present(env.PLAID_ENV);

  if (target === "production") {
    for (const name of ["PLAID_ENV", ...plaidNames]) {
      if (present(env[name])) errors.push(`${name} must be absent from Production while real-bank access is prohibited.`);
    }
  } else if (plaidConfigured) {
    if (env.PLAID_ENV !== "sandbox") errors.push("PLAID_ENV must be sandbox in staging.");
    for (const name of plaidNames) requireValue(name);
    if (usable(env.PLAID_WEBHOOK_URL) && !isHttpsUrl(env.PLAID_WEBHOOK_URL, "/api/plaid/webhook")) {
      errors.push("PLAID_WEBHOOK_URL must be a fixed HTTPS URL ending exactly in /api/plaid/webhook.");
    }
    if (usable(env.FINANCIAL_TOKEN_KEY_VERSION) && env.FINANCIAL_TOKEN_KEY_VERSION !== "v1") {
      errors.push("FINANCIAL_TOKEN_KEY_VERSION must be v1 until a documented rotation is completed.");
    }
    if (usable(env.FINANCIAL_TOKEN_KEK_V1) && decodedBase64Bytes(env.FINANCIAL_TOKEN_KEK_V1) !== 32) {
      errors.push("FINANCIAL_TOKEN_KEK_V1 must decode to exactly 32 bytes.");
    }
  }

  return errors;
}
