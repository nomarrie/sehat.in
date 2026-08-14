import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatAssistant } from "./chat-assistant";

describe("ChatAssistant", () => {
  it("renders a full-screen chat shell with a route back to the dashboard", () => {
    render(<ChatAssistant />);

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
    expect(screen.getByRole("button", { name: /progres minggu ini/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Ringkasanmu")).not.toBeInTheDocument();
    expect(screen.getByText(/aku sudah melihat progres terbarumu/i)).toBeInTheDocument();
  });

  it("starts a new local conversation and restores a selected thread", async () => {
    const user = userEvent.setup();
    render(<ChatAssistant />);

    await user.click(screen.getByRole("button", { name: "Percakapan baru" }));

    expect(screen.getByRole("heading", { name: "Mulai percakapan baru" })).toBeInTheDocument();
    expect(screen.queryByText(/aku sudah melihat progres terbarumu/i)).not.toBeInTheDocument();

    const workoutThread = screen.getByRole("button", { name: /latihan terasa berat/i });
    await user.click(workoutThread);

    expect(workoutThread).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(/kita bisa membuat latihan hari ini lebih ringan/i),
    ).toBeInTheDocument();
  });

  it("adds a typed message and a contextual dummy response", async () => {
    const user = userEvent.setup();
    render(<ChatAssistant />);

    const composer = screen.getByRole("textbox", { name: "Tulis pesan untuk pendamping" });
    await user.type(composer, "Kenapa target minggu ini belum berubah?");
    await user.click(screen.getByRole("button", { name: "Kirim pesan" }));

    expect(screen.getByText("Kenapa target minggu ini belum berubah?")).toBeInTheDocument();
    expect(screen.getByText(/target mingguanmu masih berada di rentang yang terarah/i)).toBeInTheDocument();
    expect(composer).toHaveValue("");
  });

  it("keeps the newest response in view after a message is sent", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(<ChatAssistant />);
    scrollIntoView.mockClear();

    await user.click(screen.getByRole("button", { name: "Bagaimana progresku minggu ini?" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "end" });
  });

  it("requires confirmation before applying a suggested workout adjustment", async () => {
    const user = userEvent.setup();
    render(<ChatAssistant />);

    await user.click(
      screen.getByRole("button", { name: "Latihan hari ini terasa terlalu berat" }),
    );

    expect(screen.getByRole("heading", { name: "Usulan penyesuaian" })).toBeInTheDocument();
    expect(screen.getByText(/belum mengubah paket latihanmu/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Terapkan untuk demo" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Penyesuaian diterapkan untuk sesi demo ini.",
    );
    expect(screen.getByRole("button", { name: "Sudah diterapkan" })).toBeDisabled();
  });

  it("uses a safety-forward response for pain-related questions", async () => {
    const user = userEvent.setup();
    render(<ChatAssistant />);

    const composer = screen.getByRole("textbox", { name: "Tulis pesan untuk pendamping" });
    await user.type(composer, "Lutut saya sakit saat squat");
    await user.keyboard("{Enter}");

    expect(screen.getByText(/hentikan gerakan yang memicu rasa sakit/i)).toBeInTheDocument();
    expect(screen.getByText(/tenaga kesehatan/i)).toBeInTheDocument();
  });
});
