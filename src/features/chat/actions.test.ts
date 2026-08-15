import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke, revalidatePath } = vi.hoisted(() => ({
  invoke: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireOnboardedUser: vi.fn(async () => ({
    client: { functions: { invoke } },
    user: { id: "ea5e65c9-58aa-430a-a012-0453921178c5" },
    profile: { user_id: "ea5e65c9-58aa-430a-a012-0453921178c5" },
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath }));

import {
  resolveWorkoutAdjustmentAction,
  sendChatMessageAction,
} from "./actions";

describe("chat server actions", () => {
  beforeEach(() => {
    invoke.mockReset();
    revalidatePath.mockReset();
  });

  it("rejects an empty chat message before invoking the Edge Function", async () => {
    const result = await sendChatMessageAction({
      sessionId: null,
      clientMessageId: "c48caf29-daa8-4fe0-9df0-cd56add1a191",
      content: "   ",
    });

    expect(result).toEqual({
      ok: false,
      message: "Tulis pesan sebelum mengirim.",
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("sends only the message identifiers and content to the authenticated function", async () => {
    invoke.mockResolvedValue({
      data: {
        sessionId: "58c2722c-25c7-44c1-ab04-f04a2afc15a2",
        assistantMessage: {
          id: "a108cb55-4038-4db9-845e-35af620703e7",
          content: "Jawaban personal yang aman.",
          kind: "message",
          generatedByAi: true,
          adjustment: null,
          createdAt: "2026-08-15T04:00:00.000Z",
        },
      },
      error: null,
    });

    const result = await sendChatMessageAction({
      sessionId: null,
      clientMessageId: "c48caf29-daa8-4fe0-9df0-cd56add1a191",
      content: "Bagaimana progresku minggu ini?",
    });

    expect(invoke).toHaveBeenCalledWith("sehatin-program", {
      body: {
        action: "chat-message",
        sessionId: null,
        clientMessageId: "c48caf29-daa8-4fe0-9df0-cd56add1a191",
        content: "Bagaimana progresku minggu ini?",
      },
    });
    expect(result).toMatchObject({
      ok: true,
      sessionId: "58c2722c-25c7-44c1-ab04-f04a2afc15a2",
      assistantMessage: {
        role: "assistant",
        content: "Jawaban personal yang aman.",
        generatedByAi: true,
      },
    });
  });

  it("returns a stable client error instead of forwarding backend details", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: "relation public.chat_messages does not exist" },
    });

    await expect(sendChatMessageAction({
      sessionId: null,
      clientMessageId: "c48caf29-daa8-4fe0-9df0-cd56add1a191",
      content: "Halo",
    })).resolves.toEqual({
      ok: false,
      message: "Pendamping belum dapat merespons. Coba lagi sebentar.",
    });
  });

  it("revalidates package views after an adjustment is applied", async () => {
    invoke.mockResolvedValue({
      data: {
        status: "applied",
        packageId: "97433e4f-23a8-435e-9260-6a30bd262ba4",
      },
      error: null,
    });

    const result = await resolveWorkoutAdjustmentAction({
      messageId: "12bddb75-f6c2-4365-bb72-ad29ac4a55f1",
      decision: "apply",
    });

    expect(invoke).toHaveBeenCalledWith("sehatin-program", {
      body: {
        action: "resolve-chat-adjustment",
        messageId: "12bddb75-f6c2-4365-bb72-ad29ac4a55f1",
        decision: "apply",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/packages/97433e4f-23a8-435e-9260-6a30bd262ba4",
    );
    expect(result).toEqual({
      ok: true,
      status: "applied",
      message: "Paket latihan sudah disesuaikan.",
      packageId: "97433e4f-23a8-435e-9260-6a30bd262ba4",
    });
  });
});
