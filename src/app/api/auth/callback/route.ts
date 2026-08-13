import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getInsForgeConfig } from "@/lib/insforge/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  if (!code || request.nextUrl.searchParams.get("error")) return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  const cookieStore = await cookies();
  const verifier = cookieStore.get("insforge_code_verifier")?.value;
  if (!verifier) return NextResponse.redirect(new URL("/login?error=verifier", request.url));
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const auth = createAuthActions({ ...getInsForgeConfig(), requestCookies: request.cookies, responseCookies: response.cookies });
  const { data, error } = await auth.exchangeOAuthCode(code, verifier);
  if (error || !data?.user) return NextResponse.redirect(new URL("/login?error=exchange", request.url));
  response.cookies.delete("insforge_code_verifier");
  return response;
}
