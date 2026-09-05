import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "npm:@insforge/sdk@1.5.2",
        replacement: fileURLToPath(
          new URL("./functions/test-support/insforge-sdk.stub.ts", import.meta.url),
        ),
      },
      {
        find: "npm:zod@4.4.3",
        replacement: fileURLToPath(
          new URL("./node_modules/zod/index.js", import.meta.url),
        ),
      },
      {
        find: "npm:resend@6.26.0",
        replacement: fileURLToPath(
          new URL("./node_modules/resend/dist/index.mjs", import.meta.url),
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
