import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const { cookies, requireOnboardedUser } = vi.hoisted(() => ({
  cookies: vi.fn(),
  requireOnboardedUser: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireOnboardedUser }));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));

describe("AppShell", () => {
  it("uses the shadcn desktop sidebar while retaining mobile navigation", async () => {
    cookies.mockResolvedValue({ get: vi.fn(() => undefined) });
    requireOnboardedUser.mockResolvedValue({
      user: { email: "naila@example.com" },
      profile: { full_name: "Naila" },
    });

    render(
      await AppShell({
        activePath: "/dashboard",
        children: <h1>Ringkasan hari ini</h1>,
      }),
    );

    const desktopSidebar = screen.getByRole("complementary", { name: "Navigasi utama" });
    const mobileNavigation = screen.getByRole("navigation", { name: "Navigasi utama" });

    expect(within(desktopSidebar).getAllByRole("link")).toHaveLength(5);
    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(5);
    expect(within(mobileNavigation).getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("heading", { name: "Ringkasan hari ini" })).toBeVisible();
  });

  it("initializes the sidebar from the persisted collapsed cookie", async () => {
    cookies.mockResolvedValue({
      get: vi.fn((name: string) => name === "sidebar_state" ? { value: "false" } : undefined),
    });
    requireOnboardedUser.mockResolvedValue({
      user: { email: "naila@example.com" },
      profile: { full_name: "Naila" },
    });

    render(
      await AppShell({
        activePath: "/food",
        children: <h1>Rekomendasi makanan</h1>,
      }),
    );

    const sidebar = screen.getByRole("complementary", { name: "Navigasi utama" });
    expect(sidebar.closest("[data-state]")).toHaveAttribute("data-state", "collapsed");
    expect(screen.getByRole("button", { name: "Perkecil atau perluas sidebar" }))
      .toHaveAttribute("aria-expanded", "false");
  });
});
