import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

const { mobileState } = vi.hoisted(() => ({ mobileState: { current: false } }));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobileState.current }));
vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));

describe("AppSidebar", () => {
  beforeEach(() => {
    mobileState.current = false;
    document.cookie = "sidebar_state=; path=/; max-age=0";
  });

  it("renders the active desktop destination with accessible navigation", () => {
    render(
      <SidebarProvider>
        <AppSidebar activePath="/food" name="Naila" email="naila@example.com" />
      </SidebarProvider>,
    );

    expect(screen.getByRole("complementary", { name: "Navigasi utama" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Menu aplikasi" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Makanan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("collapses and expands from the labeled sidebar control", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <AppSidebar activePath="/dashboard" name="Naila" email="naila@example.com" />
      </SidebarProvider>,
    );

    const sidebar = screen.getByRole("complementary", { name: "Navigasi utama" });
    const sidebarState = sidebar.closest("[data-state]");
    const trigger = screen.getByRole("button", { name: "Perkecil atau perluas sidebar" });

    expect(sidebarState).toHaveAttribute("data-state", "expanded");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.click(trigger);
    expect(sidebarState).toHaveAttribute("data-state", "collapsed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(sidebarState).toHaveAttribute("data-state", "expanded");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("does not introduce a drawer over the existing mobile navigation", () => {
    mobileState.current = true;

    render(
      <SidebarProvider>
        <AppSidebar activePath="/dashboard" name="Naila" email="naila@example.com" />
      </SidebarProvider>,
    );

    expect(screen.queryByRole("complementary", { name: "Navigasi utama" })).not.toBeInTheDocument();
  });

  it("restores the collapsed state when the sidebar remounts after navigation", async () => {
    const user = userEvent.setup();
    const firstPage = render(
      <SidebarProvider>
        <AppSidebar activePath="/dashboard" name="Naila" email="naila@example.com" />
      </SidebarProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Perkecil atau perluas sidebar" }));
    expect(document.cookie).toContain("sidebar_state=false");
    firstPage.unmount();

    render(
      <SidebarProvider defaultOpen>
        <AppSidebar activePath="/food" name="Naila" email="naila@example.com" />
      </SidebarProvider>,
    );

    const sidebar = screen.getByRole("complementary", { name: "Navigasi utama" });
    expect(sidebar.closest("[data-state]")).toHaveAttribute("data-state", "collapsed");
    expect(screen.getByRole("button", { name: "Perkecil atau perluas sidebar" }))
      .toHaveAttribute("aria-expanded", "false");
  });
});
