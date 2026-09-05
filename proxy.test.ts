import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

function token(exp: number, label: string) {
  const header = Buffer.from("{}").toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp, label })).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("auth session proxy", () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiredAccessToken = token(nowSeconds - 60, "expired");
  const freshAccessToken = token(nowSeconds + 3600, "fresh");
  const refreshToken = token(nowSeconds + 604800, "refresh");

  beforeEach(() => {
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://backend.example.test";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "test-anon-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      accessToken: freshAccessToken,
      refreshToken,
      user: { id: "user-id" },
    })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("forwards a refreshed access token to the Server Action and browser", async () => {
    const request = new NextRequest("https://app.example.test/packages/package-id/session", {
      method: "POST",
      headers: {
        cookie: `insforge_access_token=${expiredAccessToken}; insforge_refresh_token=${refreshToken}`,
      },
    });

    const response = await proxy(request);

    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      `insforge_access_token=${freshAccessToken}`,
    );
    expect(response.headers.get("x-middleware-request-cookie")).not.toContain(
      expiredAccessToken,
    );
    expect(response.cookies.get("insforge_access_token")?.value).toBe(
      freshAccessToken,
    );
  });

  it("lets the refresh route rotate tokens exactly once", async () => {
    const request = new NextRequest("https://app.example.test/api/auth/refresh", {
      method: "POST",
      headers: {
        cookie: `insforge_access_token=${expiredAccessToken}; insforge_refresh_token=${refreshToken}`,
      },
    });

    await proxy(request);

    expect(fetch).not.toHaveBeenCalled();
  });
});
