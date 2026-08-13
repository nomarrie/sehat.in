"use client";

import { createBrowserClient } from "@insforge/sdk/ssr";
import { getInsForgeConfig } from "./config";

export const insforgeBrowser = createBrowserClient(getInsForgeConfig());
