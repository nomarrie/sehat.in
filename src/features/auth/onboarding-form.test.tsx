import { render, screen } from "@testing-library/react";
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
});
