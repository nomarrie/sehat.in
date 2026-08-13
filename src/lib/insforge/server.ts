import "server-only";

import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { getInsForgeConfig } from "./config";

export async function createInsForgeServerClient() {
  return createServerClient({
    ...getInsForgeConfig(),
    cookies: await cookies(),
  });
}
