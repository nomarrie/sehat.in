import { describe, expect, it } from "vitest";
import { getBackendErrorMessage, isAuthenticationError } from "./errors";

describe("InsForge error mapping", () => {
  it("classifies authentication failures for safe retry handling", () => {
    const error = { message: "Unauthorized", statusCode: 401 };

    expect(isAuthenticationError(error)).toBe(true);
    expect(getBackendErrorMessage(error, "fallback")).toBe(
      "Sesi kamu sudah berakhir. Silakan masuk kembali.",
    );
  });

  it("does not classify unrelated backend failures as expired sessions", () => {
    expect(isAuthenticationError({ message: "Service unavailable" })).toBe(false);
  });

  it("recognizes structured 401 and expired-token errors", () => {
    expect(isAuthenticationError({ statusCode: 401 })).toBe(true);
    expect(isAuthenticationError({ error: "AUTH_TOKEN_EXPIRED" })).toBe(true);
  });
});
