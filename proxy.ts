import { updateSession } from "@insforge/sdk/ssr/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { getInsForgeConfig } from "@/lib/insforge/config";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  await updateSession({ ...getInsForgeConfig(), requestCookies: request.cookies, responseCookies: response.cookies });
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
