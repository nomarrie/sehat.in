import { refreshAuth } from "@insforge/sdk/ssr";
import type { NextRequest } from "next/server";
import { getInsForgeConfig } from "@/lib/insforge/config";
import { getAuthCookieOptions, isRememberMeEnabled } from "@/lib/insforge/auth-session";

export async function POST(request: NextRequest) {
  const { response } = await refreshAuth({
    ...getInsForgeConfig(),
    request,
    options: getAuthCookieOptions(isRememberMeEnabled(request.cookies)),
  });

  return response;
}
