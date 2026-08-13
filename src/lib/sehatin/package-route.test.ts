import { describe, expect, it } from "vitest";
import { resolvePackageLookup } from "./package-route";

describe("package route lookup", () => {
  it("maps the legacy practice-page slug to the current active package", () => {
    expect(resolvePackageLookup("latihan-hari-ini")).toEqual({ kind: "current" });
    expect(resolvePackageLookup("current")).toEqual({ kind: "current" });
    expect(resolvePackageLookup()).toEqual({ kind: "current" });
  });

  it("passes a valid backend UUID through unchanged", () => {
    const id = "5077bd66-498f-4d49-907e-5fa884a1bb07";
    expect(resolvePackageLookup(id)).toEqual({ kind: "id", id });
  });

  it("rejects unknown slugs before they reach a UUID database filter", () => {
    expect(resolvePackageLookup("paket-tidak-ada")).toEqual({ kind: "invalid" });
    expect(resolvePackageLookup("5077bd66-invalid")).toEqual({ kind: "invalid" });
  });
});
