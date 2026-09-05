import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OnboardingForm } from "./onboarding-form";

vi.mock("./actions", () => ({
  completeOnboardingAction: vi.fn(),
}));

describe("OnboardingForm", () => {
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
});
