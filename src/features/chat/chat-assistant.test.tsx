import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatAssistant } from "./chat-assistant";
import {
  resolveWorkoutAdjustmentAction,
  sendChatMessageAction,
} from "./actions";
import type { ChatPageData } from "./chat.types";

vi.mock("./actions", () => ({
  sendChatMessageAction: vi.fn(),
  resolveWorkoutAdjustmentAction: vi.fn(),
}));

const initialData: ChatPageData = {
  sessionId: "3a3651dd-004f-42f8-95f9-b96f9aa03e18",
  context: [
    { id: "weight", label: "Berat saat ini", value: "88,7 kg", detail: "Turun 0,5 kg minggu ini" },
    { id: "streak", label: "Streak aktif", value: "6 hari", detail: "22 dari 30 menit hari ini" },
    { id: "workout", label: "Paket aktif", value: "Latihan Hari Ini", detail: "Pemula · sekitar 28 menit" },
  ],
  messages: [
    {
      id: "assistant-welcome",
      role: "assistant",
      content: "Halo, Naila. Aku sudah melihat progres terbarumu.",
      timeLabel: "Sekarang",
      kind: "message",
      generatedByAi: false,
    },
  ],
};

describe("ChatAssistant", () => {
  beforeEach(() => {
    vi.mocked(sendChatMessageAction).mockReset();
    vi.mocked(resolveWorkoutAdjustmentAction).mockReset();
  });

  it("shows the authenticated user's program context and private-chat status", () => {
    render(<ChatAssistant initialData={initialData} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Teman ngobrol untuk langkah sehatmu" }),
    ).toBeInTheDocument();
    expect(screen.getByText("88,7 kg")).toBeInTheDocument();
    expect(screen.getByText("6 hari")).toBeInTheDocument();
    expect(screen.getByText("Latihan Hari Ini")).toBeInTheDocument();
    expect(screen.getByText(/aku sudah melihat progres terbarumu/i)).toBeInTheDocument();
    expect(screen.getByText("Percakapan privat")).toBeInTheDocument();
  });

  it("renders assistant Markdown as semantic React elements while keeping user text literal", () => {
    render(
      <ChatAssistant
        initialData={{
          ...initialData,
          messages: [
            {
              id: "assistant-markdown",
              role: "assistant",
              content: "### Rencana sederhana\n\n- Pilih **protein**\n- Tambahkan `sayur`",
              timeLabel: "Sekarang",
              kind: "message",
              generatedByAi: true,
            },
            {
              id: "user-markdown",
              role: "user",
              content: "**Tampilkan ini apa adanya**",
              timeLabel: "Sekarang",
              kind: "message",
              generatedByAi: false,
            },
          ],
        }}
      />,
    );

    const markdownHeading = screen.getByRole("heading", {
      level: 3,
      name: "Rencana sederhana",
    });
    const assistantMessage = markdownHeading.closest<HTMLElement>(".chat-message-content");

    expect(markdownHeading).toBeInTheDocument();
    expect(assistantMessage).not.toBeNull();
    expect(within(assistantMessage!).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("protein").tagName).toBe("STRONG");
    expect(screen.getByText("sayur").tagName).toBe("CODE");
    expect(screen.getByText("**Tampilkan ini apa adanya**")).toBeInTheDocument();
  });

  it("submits a message to the server and renders the persisted assistant response", async () => {
    vi.mocked(sendChatMessageAction).mockResolvedValue({
      ok: true,
      sessionId: initialData.sessionId!,
      assistantMessage: {
        id: "1d829ff6-c9fb-4d53-a63b-bd1abdc81509",
        role: "assistant",
        content: "Target minggu ini tetap aman dan paketmu masih sesuai progres terbaru.",
        timeLabel: "Sekarang",
        kind: "message",
        generatedByAi: true,
      },
    });
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);

    const composer = screen.getByRole("textbox", { name: "Tulis pesan untuk pendamping" });
    await user.type(composer, "Kenapa target minggu ini belum berubah?");
    await user.click(screen.getByRole("button", { name: "Kirim pesan" }));

    expect(sendChatMessageAction).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: initialData.sessionId,
      content: "Kenapa target minggu ini belum berubah?",
      clientMessageId: expect.any(String),
    }));
    expect(screen.getByText("Kenapa target minggu ini belum berubah?")).toBeInTheDocument();
    expect(screen.getByText(/target minggu ini tetap aman/i)).toBeInTheDocument();
    expect(composer).toHaveValue("");
  });

  it("keeps the typed message and exposes a retryable error when the gateway request fails", async () => {
    vi.mocked(sendChatMessageAction).mockResolvedValue({
      ok: false,
      message: "Pendamping belum dapat merespons. Coba lagi sebentar.",
    });
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);

    await user.type(
      screen.getByRole("textbox", { name: "Tulis pesan untuk pendamping" }),
      "Ide makan setelah latihan",
    );
    await user.keyboard("{Enter}");

    expect(screen.getAllByText("Ide makan setelah latihan")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pendamping belum dapat merespons. Coba lagi sebentar.",
    );
  });

  it("applies a suggested workout only after explicit confirmation", async () => {
    vi.mocked(sendChatMessageAction).mockResolvedValue({
      ok: true,
      sessionId: initialData.sessionId!,
      assistantMessage: {
        id: "52187aba-3d8a-41f4-accc-33dc35b4e29a",
        role: "assistant",
        content: "Aku menyiapkan versi latihan yang lebih ringan.",
        timeLabel: "Sekarang",
        kind: "adjustment",
        generatedByAi: true,
        adjustment: {
          title: "Usulan penyesuaian",
          description: "Turunkan beban hari ini tanpa menghilangkan ritme latihanmu.",
          changes: ["Chair Squat: 3 × 10 menjadi 2 × 8"],
          status: "pending",
        },
      },
    });
    vi.mocked(resolveWorkoutAdjustmentAction).mockResolvedValue({
      ok: true,
      status: "applied",
      message: "Paket latihan sudah disesuaikan.",
      packageId: "8f6eb7ee-289f-4c2c-814c-0019c4c87ef8",
    });
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);

    await user.click(
      screen.getByRole("button", { name: "Latihan hari ini terasa terlalu berat" }),
    );

    expect(screen.getByRole("heading", { name: "Usulan penyesuaian" })).toBeInTheDocument();
    expect(screen.getByText(/belum mengubah paket latihanmu/i)).toBeInTheDocument();
    expect(resolveWorkoutAdjustmentAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Terapkan penyesuaian" }));

    expect(resolveWorkoutAdjustmentAction).toHaveBeenCalledWith({
      messageId: "52187aba-3d8a-41f4-accc-33dc35b4e29a",
      decision: "apply",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Paket latihan sudah disesuaikan.",
    );
    expect(screen.getByRole("button", { name: "Sudah diterapkan" })).toBeDisabled();
  });

  it("keeps Enter-to-send and Shift+Enter for a new line", async () => {
    vi.mocked(sendChatMessageAction).mockResolvedValue({
      ok: false,
      message: "Pendamping belum dapat merespons. Coba lagi sebentar.",
    });
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);
    const composer = screen.getByRole("textbox", { name: "Tulis pesan untuk pendamping" });

    await user.type(composer, "Baris pertama");
    await user.keyboard("{Shift>}{Enter}{/Shift}baris kedua");
    expect(composer).toHaveValue("Baris pertama\nbaris kedua");
    expect(sendChatMessageAction).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(sendChatMessageAction).toHaveBeenCalledTimes(1);
  });
});
