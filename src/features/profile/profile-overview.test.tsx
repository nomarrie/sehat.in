import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { profileSettings } from "@/data/settings-data";
import { ProfileOverview } from "./profile-overview";

vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));

describe("ProfileOverview", () => {
  it("shows the three profile actions", () => {
    render(<ProfileOverview profile={profileSettings} />);
    expect(screen.getByRole("link", { name: /preferensi pribadi/i })).toHaveAttribute("href", "/profile/preferences");
    expect(screen.getByRole("link", { name: /data program/i })).toHaveAttribute("href", "/profile/program");
    expect(screen.getByRole("button", { name: /keluar/i })).toBeVisible();
  });

  it("submits logout through the account form", () => {
    render(<ProfileOverview profile={profileSettings} />);
    expect(screen.getByRole("button", { name: /keluar/i }).closest("form")).toBeInTheDocument();
  });
});
