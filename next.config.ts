import type { NextConfig } from "next";
import { parsePublishableKey } from "@clerk/shared/keys";

function safeExternalOrigin(value: string | undefined, fallback: string) {
  try {
    const url = new URL(value || fallback);
    return url.protocol === "https:" ? url.origin : fallback;
  } catch {
    return fallback;
  }
}

const clerkFrontendApi = parsePublishableKey(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
)?.frontendApi;
const clerkOrigin = safeExternalOrigin(
  process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL ||
    (clerkFrontendApi ? `https://${clerkFrontendApi}` : undefined),
  "https://clerk.accounts.dev",
);
const developmentEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://img.clerk.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${developmentEval} https://cdn.plaid.com ${clerkOrigin}`,
  `connect-src 'self' ${clerkOrigin}`,
  `frame-src https://cdn.plaid.com ${clerkOrigin}`,
];
if (process.env.NODE_ENV === "production") cspDirectives.push("upgrade-insecure-requests");
const csp = cspDirectives.join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      { source: "/:path*", headers },
    ];
  },
};

export default nextConfig;
