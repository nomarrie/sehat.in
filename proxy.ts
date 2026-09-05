import { updateSession } from "@insforge/sdk/ssr/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { getInsForgeConfig } from "@/lib/insforge/config";
import { getAuthCookieOptions, isRememberMeEnabled } from "@/lib/insforge/auth-session";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/auth/refresh") {
    return NextResponse.next();
  }

  const sessionResponse = NextResponse.next();
  await updateSession({
    ...getInsForgeConfig(),
    requestCookies: request.cookies,
    responseCookies: sessionResponse.cookies,
    options: getAuthCookieOptions(isRememberMeEnabled(request.cookies)),
  });

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  for (const cookie of sessionResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
