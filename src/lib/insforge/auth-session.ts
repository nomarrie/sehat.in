import type { AuthCookieOptions } from "@insforge/sdk/ssr";

export const REMEMBER_ME_COOKIE = "sehatin_remember_me";
export const OAUTH_REMEMBER_ME_COOKIE = "sehatin_oauth_remember_me";

const REFRESH_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_INTENT_LIFETIME_SECONDS = 60 * 10;
const SESSION_COOKIE = { expires: undefined, maxAge: undefined } as const;

type CookieReader = {
  get(name: string): string | { value?: string | null } | undefined | null;
};

export function getAuthCookieOptions(rememberMe: boolean): AuthCookieOptions {
  return {
    accessToken: { ...SESSION_COOKIE },
    ...(rememberMe ? {} : { refreshToken: { ...SESSION_COOKIE } }),
  };
}

export function isRememberMeEnabled(cookies: CookieReader): boolean {
  const marker = cookies.get(REMEMBER_ME_COOKIE);
  return (typeof marker === "string" ? marker : marker?.value) === "1";
}

export function getRememberMeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_TOKEN_LIFETIME_SECONDS,
  };
}

export function getOAuthRememberMeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_INTENT_LIFETIME_SECONDS,
  };
}
