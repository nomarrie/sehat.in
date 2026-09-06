import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOAuthRememberMeCookieOptions,
  OAUTH_REMEMBER_ME_COOKIE,
} from "@/lib/insforge/auth-session";

const authActionMocks = vi.hoisted(() => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  redirect: vi.fn(),
  createAuthActions: vi.fn(),
  createInsForgeServerClient: vi.fn(),
  signInWithOAuth: vi.fn(),
  exchangeResetPasswordToken: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: authActionMocks.getCookie,
    set: authActionMocks.setCookie,
    delete: authActionMocks.deleteCookie,
  }),
}));

vi.mock("next/navigation", () => ({ redirect: authActionMocks.redirect }));
vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: authActionMocks.createAuthActions,
}));
vi.mock("@/lib/insforge/server", () => ({
  createInsForgeServerClient: authActionMocks.createInsForgeServerClient,
}));

import {
  initiateOAuth,
  resetPasswordAction,
  verifyPasswordResetCodeAction,
} from "./actions";

describe("OAuth server action", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://backend.example.test";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "test-anon-key";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";
    authActionMocks.setCookie.mockReset();
    authActionMocks.getCookie.mockReset();
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

describe("password recovery server actions", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://backend.example.test";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "test-anon-key";
    authActionMocks.getCookie.mockReset();
    authActionMocks.setCookie.mockReset();
    authActionMocks.deleteCookie.mockReset();
    authActionMocks.redirect.mockReset();
    authActionMocks.exchangeResetPasswordToken.mockReset();
    authActionMocks.resetPassword.mockReset();
    authActionMocks.createInsForgeServerClient.mockReset();
    authActionMocks.createInsForgeServerClient.mockResolvedValue({
      auth: {
        exchangeResetPasswordToken: authActionMocks.exchangeResetPasswordToken,
        resetPassword: authActionMocks.resetPassword,
      },
    });
  });

  it("verifies the recovery code without changing the password", async () => {
    authActionMocks.exchangeResetPasswordToken.mockResolvedValue({
      data: { token: "verified-reset-token" },
      error: null,
    });
    const formData = new FormData();
    formData.set("email", "naila@example.com");
    formData.set("otp", "123456");

    const result = await verifyPasswordResetCodeAction({}, formData);

    expect(result).toMatchObject({
      passwordResetStep: "password",
      verificationEmail: "naila@example.com",
    });
    expect(authActionMocks.resetPassword).not.toHaveBeenCalled();
    expect(authActionMocks.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      "verified-reset-token",
      expect.objectContaining({ httpOnly: true, path: "/reset-password" }),
    );
  });

  it("refuses to change the password without a previously verified reset token", async () => {
    authActionMocks.getCookie.mockReturnValue(undefined);
    const formData = new FormData();
    formData.set("email", "naila@example.com");
    formData.set("newPassword", "password1");

    const result = await resetPasswordAction({}, formData);

    expect(result).toMatchObject({ passwordResetStep: "request" });
    expect(authActionMocks.resetPassword).not.toHaveBeenCalled();
    expect(authActionMocks.redirect).not.toHaveBeenCalled();
  });

  it("changes the password with the server-held verified token and consumes it", async () => {
    authActionMocks.getCookie.mockReturnValue({ value: "verified-reset-token" });
    authActionMocks.resetPassword.mockResolvedValue({ data: { success: true }, error: null });
    const formData = new FormData();
    formData.set("email", "naila@example.com");
    formData.set("newPassword", "password1");
    formData.set("confirmNewPassword", "password1");

    await resetPasswordAction({}, formData);

    expect(authActionMocks.resetPassword).toHaveBeenCalledWith({
      newPassword: "password1",
      otp: "verified-reset-token",
    });
    expect(authActionMocks.setCookie).toHaveBeenCalledWith(
      expect.any(String),
      "",
      expect.objectContaining({ maxAge: 0, path: "/reset-password" }),
    );
    expect(authActionMocks.redirect).toHaveBeenCalledWith("/login?reset=success");
  });

  it("does not change the password when the confirmation does not match", async () => {
    authActionMocks.getCookie.mockReturnValue({ value: "verified-reset-token" });
    const formData = new FormData();
    formData.set("email", "naila@example.com");
    formData.set("newPassword", "password1");
    formData.set("confirmNewPassword", "password2");

    const result = await resetPasswordAction({}, formData);

    expect(result).toMatchObject({
      passwordResetStep: "password",
      errors: { confirmNewPassword: ["Konfirmasi kata sandi tidak sama."] },
    });
    expect(authActionMocks.resetPassword).not.toHaveBeenCalled();
  });
});
