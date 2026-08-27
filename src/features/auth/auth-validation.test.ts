import { describe, expect, it } from "vitest";
import { onboardingSchema, signInSchema, signUpSchema } from "./auth-validation";

describe("auth validation", () => {
  it("records remember me only when the checkbox is explicitly selected", () => {
    const remembered = signInSchema.parse({
      email: "naila@example.com",
      password: "PASSWORD1",
      rememberMe: "on",
    });
    const sessionOnly = signInSchema.parse({
      email: "naila@example.com",
      password: "PASSWORD1",
    });

    expect(remembered.rememberMe).toBe(true);
    expect(sessionOnly.rememberMe).toBe(false);
  });

  it("treats an unchecked FormData checkbox as a session-only login", () => {
    const formData = new FormData();

    const result = signInSchema.parse({
      email: "naila@example.com",
      password: "PASSWORD1",
      rememberMe: formData.get("rememberMe"),
    });

    expect(result.rememberMe).toBe(false);
  });

  it("requires a strong-enough account password", () => {
    const result = signUpSchema.safeParse({
      name: "Naila Putri",
      email: "naila@example.com",
      password: "PASSWORD",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toEqual(
        expect.arrayContaining([
          "Gunakan setidaknya satu huruf kecil.",
          "Gunakan setidaknya satu angka.",
        ]),
      );
    }
  });

  it("accepts onboarding data within the PRD safety boundaries", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Naila Putri",
      age: "28",
      heightCm: "165",
      initialWeightKg: "88.7",
      targetWeightKg: "75",
      weeklyTargetKg: "0.5",
      activityLevel: "pemula",
      mealPreference: "seimbang",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.aiProcessingConsent).toBe(false);
  });

  it("records AI processing consent only when the checkbox is explicitly selected", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Naila Putri",
      age: "28",
      heightCm: "165",
      initialWeightKg: "88.7",
      targetWeightKg: "75",
      weeklyTargetKg: "0.5",
      activityLevel: "pemula",
      mealPreference: "seimbang",
      aiProcessingConsent: "on",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.aiProcessingConsent).toBe(true);
  });

  it("rejects an unsafe weekly target and a target above the starting weight", () => {
    const result = onboardingSchema.safeParse({
      fullName: "Naila Putri",
      age: "28",
      heightCm: "165",
      initialWeightKg: "88.7",
      targetWeightKg: "90",
      weeklyTargetKg: "1.5",
      activityLevel: "pemula",
      mealPreference: "seimbang",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.weeklyTargetKg).toContain("Target mingguan maksimal 1 kg.");
      expect(errors.targetWeightKg).toContain("Target berat harus lebih rendah dari berat awal.");
    }
  });
});
