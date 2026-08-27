import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DesktopProfileMenu } from "./desktop-profile-menu";

vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));

describe("DesktopProfileMenu", () => {
  it("opens the three account actions from the Naila trigger", async () => {
    const user = userEvent.setup();
    render(<DesktopProfileMenu name="Naila" email="naila@example.com" />);
    const trigger = screen.getByRole("button", { name: /buka menu profil naila/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Menu profil" })).not.toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAccessibleName(/tutup menu profil naila/i);
    expect(screen.getByRole("link", { name: "Preferensi pribadi" })).toHaveAttribute("href", "/profile/preferences");
    expect(screen.getByRole("link", { name: "Data program" })).toHaveAttribute("href", "/profile/program");
    expect(screen.getByRole("button", { name: "Keluar" })).toBeVisible();
  });

  it("submits logout through the account form", async () => {
    const user = userEvent.setup();
    render(<DesktopProfileMenu name="Naila" email="naila@example.com" />);
    await user.click(screen.getByRole("button", { name: /buka menu profil naila/i }));
    expect(screen.getByRole("button", { name: "Keluar" }).closest("form")).toBeInTheDocument();
    expect(screen.getByText("naila@example.com")).toBeVisible();
  });

  it("closes the popover with Escape and restores trigger focus", async () => {
    const user = userEvent.setup();
    render(<DesktopProfileMenu name="Naila" email="naila@example.com" />);
    const trigger = screen.getByRole("button", { name: /buka menu profil naila/i });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation", { name: "Menu profil" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
