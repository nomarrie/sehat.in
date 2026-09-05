import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOAuthRememberMeCookieOptions,
  OAUTH_REMEMBER_ME_COOKIE,
} from "@/lib/insforge/auth-session";

const authActionMocks = vi.hoisted(() => ({
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  redirect: vi.fn(),
  createAuthActions: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: vi.fn(),
    set: authActionMocks.setCookie,
    delete: authActionMocks.deleteCookie,
  }),
}));

vi.mock("next/navigation", () => ({ redirect: authActionMocks.redirect }));
vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: authActionMocks.createAuthActions,
}));
vi.mock("@/lib/insforge/server", () => ({
  createInsForgeServerClient: vi.fn(),
}));

import { initiateOAuth } from "./actions";

describe("OAuth server action", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://backend.example.test";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "test-anon-key";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";
    authActionMocks.setCookie.mockReset();
    authActionMocks.deleteCookie.mockReset();
    authActionMocks.redirect.mockReset();
    authActionMocks.signInWithOAuth.mockReset();
    authActionMocks.signInWithOAuth.mockResolvedValue({
      data: {
        url: "https://accounts.example.test/oauth",
        codeVerifier: "code-verifier",
      },
      error: null,
    });
    authActionMocks.createAuthActions.mockReset();
    authActionMocks.createAuthActions.mockReturnValue({
      signInWithOAuth: authActionMocks.signInWithOAuth,
    });
  });

  it.each([
    ["google", true, "1"],
    ["facebook", false, "0"],
  ] as const)("carries the remember-me intent through %s OAuth", async (provider, rememberMe, value) => {
    await initiateOAuth(provider, rememberMe);

    expect(authActionMocks.signInWithOAuth).toHaveBeenCalledWith(provider, {
      redirectTo: "https://app.example.test/api/auth/callback",
      skipBrowserRedirect: true,
    });
    expect(authActionMocks.setCookie).toHaveBeenCalledWith(
      OAUTH_REMEMBER_ME_COOKIE,
      value,
      getOAuthRememberMeCookieOptions(),
    );
    expect(authActionMocks.redirect).toHaveBeenCalledWith(
      "https://accounts.example.test/oauth",
    );
  });
});
