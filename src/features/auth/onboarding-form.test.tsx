import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingForm } from "./onboarding-form";
import { completeOnboardingAction } from "./actions";

vi.mock("./actions", () => ({
  completeOnboardingAction: vi.fn(),
}));

describe("OnboardingForm", () => {
  beforeEach(() => {
    vi.mocked(completeOnboardingAction).mockReset();
  });

  it("asks for optional, unchecked consent before health-program data is sent to AI", () => {
    render(<OnboardingForm defaultName="Naila Putri" />);

    const consent = screen.getByRole("checkbox", { name: /izinkan personalisasi dengan ai/i });
    expect(consent).not.toBeChecked();
    expect(consent).toHaveAttribute("name", "aiProcessingConsent");
    expect(screen.getByText(/tanpa persetujuan, sehat\.in tetap membuat rencana lokal/i)).toBeInTheDocument();
  });

  it("lets the user choose weight loss or gradual weight gain", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm defaultName="Naila Putri" />);

    const loss = screen.getByRole("radio", { name: /turunkan berat badan/i });
    const gain = screen.getByRole("radio", { name: /naikkan berat badan/i });
    expect(loss).toBeChecked();
    expect(gain).not.toBeChecked();

    await user.click(gain);

    expect(gain).toBeChecked();
    expect(loss).not.toBeChecked();
    expect(screen.getByRole("spinbutton", { name: /target mingguan/i })).toHaveValue(0.25);
    expect(screen.getByText(/rentang kenaikan bertahap: 0,25–0,5 kg/i)).toBeVisible();
  });

  it("keeps every submitted value and identifies invalid fields after validation fails", async () => {
    vi.mocked(completeOnboardingAction).mockResolvedValue({
      errors: {
        age: ["Usia minimal 13 tahun."],
        targetWeightKg: ["Target berat harus lebih tinggi dari berat awal."],
      },
      message: "Periksa kembali kolom yang ditandai.",
    });
    const user = userEvent.setup();
    render(<OnboardingForm defaultName="Naila Putri" />);

    await user.clear(screen.getByRole("textbox", { name: "Nama lengkap" }));
    await user.type(screen.getByRole("textbox", { name: "Nama lengkap" }), "Naila Utami");
    await user.type(screen.getByRole("spinbutton", { name: "Usia" }), "11");
    await user.type(screen.getByRole("spinbutton", { name: "Tinggi badan" }), "165");
    await user.click(screen.getByRole("radio", { name: /naikkan berat badan/i }));
    await user.type(screen.getByRole("spinbutton", { name: "Berat awal" }), "52");
    await user.type(screen.getByRole("spinbutton", { name: "Target berat" }), "50");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tingkat aktivitas" }), "aktif");
    await user.selectOptions(screen.getByRole("combobox", { name: "Preferensi makanan" }), "nabati");
    await user.click(screen.getByRole("checkbox", { name: /izinkan personalisasi dengan ai/i }));
    await user.click(screen.getByRole("button", { name: "Mulai program saya" }));

    await waitFor(() => expect(completeOnboardingAction).toHaveBeenCalledOnce());
    expect(await screen.findByText("Usia minimal 13 tahun.")).toBeVisible();
    expect(screen.getByText("Target berat harus lebih tinggi dari berat awal.")).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Usia" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("spinbutton", { name: "Target berat" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "Nama lengkap" })).toHaveValue("Naila Utami");
    expect(screen.getByRole("spinbutton", { name: "Usia" })).toHaveValue(11);
    expect(screen.getByRole("spinbutton", { name: "Tinggi badan" })).toHaveValue(165);
    expect(screen.getByRole("radio", { name: /naikkan berat badan/i })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Berat awal" })).toHaveValue(52);
    expect(screen.getByRole("spinbutton", { name: "Target berat" })).toHaveValue(50);
    expect(screen.getByRole("spinbutton", { name: "Target mingguan" })).toHaveValue(0.25);
    expect(screen.getByRole("combobox", { name: "Tingkat aktivitas" })).toHaveValue("aktif");
    expect(screen.getByRole("combobox", { name: "Preferensi makanan" })).toHaveValue("nabati");
    expect(screen.getByRole("checkbox", { name: /izinkan personalisasi dengan ai/i })).toBeChecked();
  });
});
