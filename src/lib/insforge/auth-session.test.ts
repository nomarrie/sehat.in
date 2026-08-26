import { describe, expect, it } from "vitest";
import {
  getAuthCookieOptions,
  isRememberMeEnabled,
} from "./auth-session";

describe("auth session cookie policy", () => {
  it("keeps the access token in a session cookie when remember me is enabled", () => {
    expect(getAuthCookieOptions(true)).toEqual({
      accessToken: { expires: undefined, maxAge: undefined },
    });
  });

  it("keeps both tokens in session cookies when remember me is disabled", () => {
    expect(getAuthCookieOptions(false)).toEqual({
      accessToken: { expires: undefined, maxAge: undefined },
      refreshToken: { expires: undefined, maxAge: undefined },
    });
  });

  it("recognizes only an explicit remember-me marker", () => {
    expect(isRememberMeEnabled({ get: () => ({ value: "1" }) })).toBe(true);
    expect(isRememberMeEnabled({ get: () => "1" })).toBe(true);
    expect(isRememberMeEnabled({ get: () => ({ value: "0" }) })).toBe(false);
    expect(isRememberMeEnabled({ get: () => undefined })).toBe(false);
  });
});
