const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CURRENT_PACKAGE_ALIASES = new Set(["latihan-hari-ini", "current"]);

export type PackageLookup =
  | { kind: "current" }
  | { kind: "id"; id: string }
  | { kind: "invalid" };

export function resolvePackageLookup(packageId?: string): PackageLookup {
  if (!packageId || CURRENT_PACKAGE_ALIASES.has(packageId)) return { kind: "current" };
  if (UUID_PATTERN.test(packageId)) return { kind: "id", id: packageId };
  return { kind: "invalid" };
}
