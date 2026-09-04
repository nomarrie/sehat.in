import { describe, expect, it } from "vitest";
import {
  createChatThread,
  formatChatThreadTimeLabel,
} from "./chat-history";
import type { ChatMessage } from "./chat.types";

describe("chat history summaries", () => {
  it("uses the first user message as the title and the latest message as the preview", () => {
    const messages: ChatMessage[] = [
      {
        id: "assistant-greeting",
        role: "assistant",
        content: "Halo, ada yang ingin dibahas?",
        timeLabel: "08.00",
        generatedByAi: false,
      },
      {
        id: "user-question",
        role: "user",
        content: "  Bagaimana   progresku\nminggu ini?  ",
        timeLabel: "08.01",
        generatedByAi: false,
      },
      {
        id: "assistant-answer",
        role: "assistant",
        content: "Progresmu bergerak bertahap dan target minggu ini masih aman.",
        timeLabel: "08.02",
        generatedByAi: true,
      },
    ];

    expect(createChatThread({ id: "session-1", messages, timeLabel: "Hari ini" }))
      .toMatchObject({
        title: "Bagaimana progresku minggu ini?",
        preview: "Progresmu bergerak bertahap dan target minggu ini masih aman.",
      });
  });

  it("formats recent dates in the user's time zone", () => {
    const now = new Date("2026-09-01T04:00:00.000Z");

    expect(formatChatThreadTimeLabel(
      "2026-09-01T01:00:00.000Z",
      "Asia/Makassar",
      now,
    )).toBe("Hari ini");
    expect(formatChatThreadTimeLabel(
      "2026-08-31T01:00:00.000Z",
      "Asia/Makassar",
      now,
    )).toBe("Kemarin");
    expect(formatChatThreadTimeLabel(
      "2026-08-28T01:00:00.000Z",
      "Asia/Makassar",
      now,
    )).toBe("28 Agu");
  });
});
