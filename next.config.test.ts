import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("Next.js security headers", () => {
  it("prevents framing and enables baseline browser protections on every route", async () => {
    const entries = await nextConfig.headers?.();
    const globalEntry = entries?.find((entry) => entry.source === "/(.*)");
    const headers = Object.fromEntries(
      (globalEntry?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });
});
