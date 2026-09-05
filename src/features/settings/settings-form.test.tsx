import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { profileSettings } from "@/data/settings-data";
import { SettingsForm } from "./settings-form";

vi.mock("./actions", () => ({
  saveSettingsAction: async () => ({ ok: true, message: "Perubahan tersimpan." }),
}));

describe("SettingsForm", () => {
  it("returns split settings pages to the dashboard", () => {
    render(<SettingsForm initialSettings={profileSettings} mode="program" />);

    expect(screen.getByRole("link", { name: "Kembali ke dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("persists an edited name through the server action", async () => {
    const user = userEvent.setup();
    render(<SettingsForm initialSettings={profileSettings} />);
    const name = screen.getByRole("textbox", { name: "Nama lengkap" });
    await user.clear(name);
    await user.type(name, "Naila Putri");
    await user.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Perubahan tersimpan"));
    expect(screen.getByRole("button", { name: "Simpan perubahan" })).toBeDisabled();
  });

  it("shows inline validation for an unsafe weekly target", async () => {
    const user = userEvent.setup();
    render(<SettingsForm initialSettings={profileSettings} />);
    const weeklyTarget = screen.getByRole("spinbutton", { name: "Target mingguan" });
    await user.clear(weeklyTarget);
    await user.type(weeklyTarget, "0.4");
    await user.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(screen.getByText(/target aman antara 0,5–1 kg/i)).toBeVisible();
  });

  it("lets existing users explicitly enable AI personalization", async () => {
    const user = userEvent.setup();
    render(<SettingsForm initialSettings={profileSettings} mode="program" />);

    const consent = screen.getByRole("checkbox", { name: /izinkan personalisasi dengan ai/i });
    expect(consent).not.toBeChecked();
    await user.click(consent);
    await user.click(screen.getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Perubahan tersimpan"));
    expect(consent).toBeChecked();
  });
});
