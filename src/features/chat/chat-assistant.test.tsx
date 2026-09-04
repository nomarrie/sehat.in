import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatAssistant } from "./chat-assistant";
import {
  resolveChatAdjustmentAction,
  sendChatMessageAction,
} from "./actions";
import type { ChatPageData, ChatThread } from "./chat.types";

vi.mock("./actions", () => ({
  sendChatMessageAction: vi.fn(),
  resolveChatAdjustmentAction: vi.fn(),
}));

const latestMessages: ChatPageData["messages"] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content: "Halo, Naila. Aku sudah melihat progres terbarumu.",
    timeLabel: "Sekarang",
    kind: "message",
    generatedByAi: false,
  },
];

const recentThreads: ChatThread[] = [
  {
    id: "3a3651dd-004f-42f8-95f9-b96f9aa03e18",
    title: "Progres minggu ini",
    preview: "Aku sudah melihat progres terbarumu.",
    timeLabel: "Hari ini",
    messages: latestMessages,
  },
  {
    id: "7bd30db7-19dc-49f4-b229-9c3a33d28a9c",
    title: "Ide makan setelah latihan",
    preview: "Coba padukan protein, sayur, dan karbohidrat secukupnya.",
    timeLabel: "Kemarin",
    messages: [
      {
        id: "older-user-message",
        role: "user",
        content: "Ide makan setelah latihan",
        timeLabel: "18.20",
        kind: "message",
        generatedByAi: false,
      },
      {
        id: "older-assistant-message",
        role: "assistant",
        content: "Coba padukan protein, sayur, dan karbohidrat secukupnya.",
        timeLabel: "18.21",
        kind: "message",
        generatedByAi: true,
      },
    ],
  },
];

const initialData: ChatPageData = {
  sessionId: "3a3651dd-004f-42f8-95f9-b96f9aa03e18",
  context: [
    { id: "weight", label: "Berat saat ini", value: "88,7 kg", detail: "Turun 0,5 kg minggu ini" },
    { id: "streak", label: "Streak aktif", value: "6 hari", detail: "22 dari 30 menit hari ini" },
    { id: "workout", label: "Paket aktif", value: "Latihan Hari Ini", detail: "Pemula · sekitar 28 menit" },
  ],
  messages: latestMessages,
  threads: recentThreads,
};

describe("ChatAssistant", () => {
  beforeEach(() => {
    vi.mocked(sendChatMessageAction).mockReset();
    vi.mocked(resolveChatAdjustmentAction).mockReset();
  });

  it("renders the standalone chat shell with a private conversation and dashboard route", () => {
    render(<ChatAssistant initialData={initialData} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Pendamping Sehat.in" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "chat-conversation");
    expect(screen.getByRole("link", { name: "Kembali ke dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("complementary", { name: "Riwayat percakapan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Percakapan baru" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /progres minggu ini/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText("Ringkasanmu")).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Percakapan" }))
      .getByText(/aku sudah melihat progres terbarumu/i)).toBeInTheDocument();
    expect(screen.getByText("Percakapan privat")).toBeInTheDocument();
  });

  it("starts a new conversation and restores the latest persisted thread", async () => {
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);

    await user.click(screen.getByRole("button", { name: "Percakapan baru" }));
    expect(screen.getByRole("heading", { name: "Mulai percakapan baru" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Percakapan" }))
      .queryByText(/aku sudah melihat progres terbarumu/i)).not.toBeInTheDocument();

    const latestThread = screen.getByRole("button", { name: /progres minggu ini/i });
    await user.click(latestThread);
    expect(latestThread).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("list", { name: "Percakapan" }))
      .getByText(/aku sudah melihat progres terbarumu/i)).toBeInTheDocument();
  });

  it("scrolls only the message feed when conversation content changes", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight",
    );

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => 1200,
    });

    try {
      render(<ChatAssistant initialData={initialData} />);

      const feed = screen.getByRole("list", { name: "Percakapan" });
      expect(feed.scrollTop).toBe(1200);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollIntoView",
          originalScrollIntoView,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
      if (originalScrollHeight) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollHeight",
          originalScrollHeight,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
      }
    }
  });

  it("shows recent conversations and switches to a selected persisted thread", async () => {
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);

    const historySidebar = screen.getByRole("complementary", { name: "Riwayat percakapan" });
    const olderThread = within(historySidebar).getByRole("button", {
      name: /ide makan setelah latihan/i,
    });
    expect(screen.getByRole("combobox", { name: "Riwayat percakapan" })).toHaveValue(
      initialData.sessionId,
    );

    await user.click(olderThread);

    expect(olderThread).toHaveAttribute("aria-pressed", "true");
    const conversation = within(screen.getByRole("list", { name: "Percakapan" }));
    expect(conversation.getByText(/padukan protein, sayur/i)).toBeInTheDocument();
    expect(conversation.queryByText(/aku sudah melihat progres terbarumu/i)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Riwayat percakapan" })).toHaveValue(
      recentThreads[1].id,
    );
  });

  it("continues the selected historical conversation", async () => {
    vi.mocked(sendChatMessageAction).mockResolvedValue({
      ok: true,
      sessionId: recentThreads[1].id,
      assistantMessage: {
        id: "f7f9d2eb-cac6-4c1a-b20a-c82aecb6e559",
        role: "assistant",
        content: "Boleh, pilih porsi yang terasa cukup dan nyaman untukmu.",
        timeLabel: "Sekarang",
        kind: "message",
        generatedByAi: true,
      },
    });
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);

    const historySidebar = screen.getByRole("complementary", { name: "Riwayat percakapan" });
    await user.click(within(historySidebar).getByRole("button", {
      name: /ide makan setelah latihan/i,
    }));
    await user.type(
      screen.getByRole("textbox", { name: "Tulis pesan untuk pendamping" }),
      "Boleh ditambah buah?",
    );
    await user.keyboard("{Enter}");

    expect(sendChatMessageAction).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: recentThreads[1].id,
      content: "Boleh ditambah buah?",
    }));
    expect(within(screen.getByRole("list", { name: "Percakapan" }))
      .getByText(/pilih porsi yang terasa cukup/i)).toBeInTheDocument();
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
    const conversation = within(screen.getByRole("list", { name: "Percakapan" }));
    expect(conversation.getByText("Kenapa target minggu ini belum berubah?")).toBeInTheDocument();
    expect(conversation.getByText(/target minggu ini tetap aman/i)).toBeInTheDocument();
    expect(composer).toHaveValue("");
  });

  it("keeps the typed message and exposes a retryable error when Groq is unavailable", async () => {
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

    expect(within(screen.getByRole("list", { name: "Percakapan" }))
      .getByText("Ide makan setelah latihan")).toBeInTheDocument();
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
          target: "workout",
          title: "Usulan penyesuaian",
          description: "Turunkan beban hari ini tanpa menghilangkan ritme latihanmu.",
          rows: [{ label: "Chair Squat", before: "3 set × 10 repetisi", after: "2 set × 8 repetisi" }],
          status: "pending",
        },
      },
    });
    vi.mocked(resolveChatAdjustmentAction).mockResolvedValue({
      ok: true,
      status: "applied",
      target: "workout",
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
    const table = screen.getByRole("table", { name: "Perbandingan penyesuaian latihan" });
    expect(within(table).getByRole("columnheader", { name: "Saat ini" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "2 set × 8 repetisi" })).toBeInTheDocument();
    expect(resolveChatAdjustmentAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Terapkan penyesuaian" }));
    expect(resolveChatAdjustmentAction).toHaveBeenCalledWith({
      messageId: "52187aba-3d8a-41f4-accc-33dc35b4e29a",
      decision: "apply",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Paket latihan sudah disesuaikan.");
    expect(screen.getByRole("button", { name: "Sudah diterapkan" })).toBeDisabled();
  });

  it("shows and applies a food adjustment table only after confirmation", async () => {
    vi.mocked(sendChatMessageAction).mockResolvedValue({
      ok: true,
      sessionId: initialData.sessionId!,
      assistantMessage: {
        id: "53d3cd65-32cd-47ae-b2b8-38ef2fac1208",
        role: "assistant",
        content: "Aku menyiapkan usulan menu ayam untuk makan siang.",
        timeLabel: "Sekarang",
        kind: "adjustment",
        generatedByAi: true,
        adjustment: {
          target: "food",
          title: "Usulan penyesuaian makanan",
          description: "Ganti menu makan siang tanpa mengubah waktu makan lain.",
          rows: [{ label: "Makan siang", before: "Tempe panggang", after: "Ayam panggang dan sayur" }],
          status: "pending",
        },
      },
    });
    vi.mocked(resolveChatAdjustmentAction).mockResolvedValue({
      ok: true,
      status: "applied",
      target: "food",
      message: "Rekomendasi makanan sudah disesuaikan.",
      recommendationSetId: "664d32b2-fd29-4874-a2d1-a55547d177eb",
    });
    const user = userEvent.setup();
    render(<ChatAssistant initialData={initialData} />);

    const composer = screen.getByRole("textbox", { name: "Tulis pesan untuk pendamping" });
    await user.type(composer, "Saya ingin makan ayam hari ini");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("table", { name: "Perbandingan penyesuaian makanan" })).toBeInTheDocument();
    expect(screen.getByText(/belum mengubah rekomendasi makananmu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pertahankan menu" })).toBeInTheDocument();
    expect(resolveChatAdjustmentAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Terapkan penyesuaian" }));
    expect(resolveChatAdjustmentAction).toHaveBeenCalledWith({
      messageId: "53d3cd65-32cd-47ae-b2b8-38ef2fac1208",
      decision: "apply",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Rekomendasi makanan sudah disesuaikan.");
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
