import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatPage from "./page";

const { requireOnboardedUser } = vi.hoisted(() => ({
  requireOnboardedUser: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireOnboardedUser,
}));

describe("ChatPage", () => {
  it("keeps authentication while rendering outside the dashboard AppShell", async () => {
    requireOnboardedUser.mockResolvedValue({
      user: { email: "naila@example.com" },
      profile: { full_name: "Naila" },
    });

    render(await ChatPage());

    expect(requireOnboardedUser).toHaveBeenCalledOnce();
    expect(screen.queryByRole("navigation", { name: "Navigasi utama" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "chat-conversation");
  });
});
