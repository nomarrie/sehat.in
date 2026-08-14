import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

function insForgeConnectSources() {
  const rawUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  if (!rawUrl) return [];
  try {
    const origin = new URL(rawUrl).origin;
    return [origin, origin.replace(/^http/, "ws")];
  } catch {
    return [];
  }
}

const connectSources = [
  "'self'",
  ...insForgeConnectSources(),
  ...(isDevelopment ? ["ws:", "wss:"] : []),
].join(" ");

const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src ${connectSources};
  object-src 'none';
  frame-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  ${isDevelopment ? "" : "upgrade-insecure-requests;"}
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  ...(isDevelopment
    ? []
    : [{
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      }]),
];

const nextConfig: NextConfig = {
  headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
