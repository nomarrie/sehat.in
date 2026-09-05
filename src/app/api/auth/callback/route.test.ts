import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthCookieOptions } from "@/lib/insforge/auth-session";

const authMocks = vi.hoisted(() => ({
  rememberMe: "1",
  createAuthActions: vi.fn(),
  exchangeOAuthCode: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "insforge_code_verifier") return { value: "verifier" };
      if (name === "sehatin_oauth_remember_me") {
        return { value: authMocks.rememberMe };
      }
      return undefined;
    },
  }),
}));

vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: authMocks.createAuthActions,
}));

import { GET } from "./route";

describe("OAuth callback session policy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://backend.example.test";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "test-anon-key";
    authMocks.rememberMe = "1";
    authMocks.exchangeOAuthCode.mockReset();
    authMocks.exchangeOAuthCode.mockResolvedValue({
      data: { user: { id: "user-id" } },
      error: null,
    });
    authMocks.createAuthActions.mockReset();
    authMocks.createAuthActions.mockReturnValue({
      exchangeOAuthCode: authMocks.exchangeOAuthCode,
    });
  });

  it("keeps an OAuth refresh token persistent when remember me was selected", async () => {
    const response = await GET(
      new NextRequest("https://app.example.test/api/auth/callback?insforge_code=code"),
    );

    expect(authMocks.createAuthActions).toHaveBeenCalledWith(
      expect.objectContaining({ options: getAuthCookieOptions(true) }),
    );
    expect(response.cookies.get("sehatin_remember_me")?.value).toBe("1");
    expect(response.cookies.get("sehatin_oauth_remember_me")?.value).toBe("");
  });

  it("uses session-only OAuth cookies when remember me was not selected", async () => {
    authMocks.rememberMe = "0";

    const response = await GET(
      new NextRequest("https://app.example.test/api/auth/callback?insforge_code=code"),
    );

    expect(authMocks.createAuthActions).toHaveBeenCalledWith(
      expect.objectContaining({ options: getAuthCookieOptions(false) }),
    );
    expect(response.cookies.get("sehatin_remember_me")?.value).toBe("");
  });
});
