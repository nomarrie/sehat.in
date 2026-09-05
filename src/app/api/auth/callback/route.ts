import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getInsForgeConfig } from "@/lib/insforge/config";
import {
  getAuthCookieOptions,
  getRememberMeCookieOptions,
  OAUTH_REMEMBER_ME_COOKIE,
  REMEMBER_ME_COOKIE,
} from "@/lib/insforge/auth-session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  if (!code || request.nextUrl.searchParams.get("error")) return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  const cookieStore = await cookies();
  const verifier = cookieStore.get("insforge_code_verifier")?.value;
  if (!verifier) return NextResponse.redirect(new URL("/login?error=verifier", request.url));
  const rememberMe = cookieStore.get(OAUTH_REMEMBER_ME_COOKIE)?.value === "1";
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const auth = createAuthActions({
    ...getInsForgeConfig(),
    requestCookies: request.cookies,
    responseCookies: response.cookies,
    options: getAuthCookieOptions(rememberMe),
  });
  const { data, error } = await auth.exchangeOAuthCode(code, verifier);
  if (error || !data?.user) return NextResponse.redirect(new URL("/login?error=exchange", request.url));
  if (rememberMe) {
    response.cookies.set(REMEMBER_ME_COOKIE, "1", getRememberMeCookieOptions());
  } else {
    response.cookies.delete(REMEMBER_ME_COOKIE);
  }
  response.cookies.delete("insforge_code_verifier");
  response.cookies.delete(OAUTH_REMEMBER_ME_COOKIE);
  return response;
}
