import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatPage from "./page";

const { loadChatPageData, requireOnboardedUser } = vi.hoisted(() => ({
  loadChatPageData: vi.fn(),
  requireOnboardedUser: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireOnboardedUser,
}));

vi.mock("@/lib/sehatin/queries", () => ({
  loadChatPageData,
}));

describe("ChatPage", () => {
  it("keeps authentication while rendering outside the dashboard AppShell", async () => {
    requireOnboardedUser.mockResolvedValue({
      user: { email: "naila@example.com" },
      profile: { full_name: "Naila" },
    });
    loadChatPageData.mockResolvedValue({
      sessionId: null,
      context: [],
      messages: [{
        id: "assistant-welcome",
        role: "assistant",
        content: "Halo, Naila.",
        timeLabel: "Sekarang",
        kind: "message",
        generatedByAi: false,
      }],
    });

    render(await ChatPage());

    expect(requireOnboardedUser).toHaveBeenCalledOnce();
    expect(screen.queryByRole("navigation", { name: "Navigasi utama" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "chat-conversation");
  });
});
