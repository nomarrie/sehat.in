import { describe, expect, it } from "vitest";
import { profileSettings } from "@/data/settings-data";
import { settingsToDraft, validateSettingsDraft } from "./settings-validation";

describe("settings validation", () => {
  it("accepts the dummy settings", () => {
    const result = validateSettingsDraft(settingsToDraft(profileSettings));
    expect(result.errors).toEqual({});
    expect(result.value).toEqual(profileSettings);
  });

  it("keeps the weekly target in the safe range", () => {
    const draft = settingsToDraft(profileSettings);
    const result = validateSettingsDraft({ ...draft, weeklyTargetKg: "0.4" });
    expect(result.errors.weeklyTargetKg).toContain("0,5–1 kg");
  });

  it("requires a lower target weight", () => {
    const draft = settingsToDraft(profileSettings);
    const result = validateSettingsDraft({ ...draft, targetWeightKg: "90" });
    expect(result.errors.targetWeightKg).toContain("lebih rendah");
  });

  it("validates a gradual gain target in the opposite direction", () => {
    const draft = settingsToDraft({
      ...profileSettings,
      goalDirection: "gain",
      currentWeightKg: 52,
      targetWeightKg: 58,
      weeklyTargetKg: 0.25,
    });

    expect(validateSettingsDraft(draft).errors).toEqual({});
    expect(validateSettingsDraft({ ...draft, targetWeightKg: "50" }).errors.targetWeightKg).toContain("lebih tinggi");
    expect(validateSettingsDraft({ ...draft, weeklyTargetKg: "0.6" }).errors.weeklyTargetKg).toContain("0,25–0,5 kg");
  });

  it("requires a supported age", () => {
    const draft = settingsToDraft(profileSettings);
    expect(validateSettingsDraft({ ...draft, age: "10" }).errors.age).toContain("13–100");
  });
});
