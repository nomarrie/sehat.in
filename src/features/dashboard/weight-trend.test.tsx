import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { dashboardData } from "@/data/mock-data";
import { WeightTrend } from "./weight-trend";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({
  recordWeightAction: async () => ({ ok: true, message: "Berat tersimpan." }),
}));

function renderTracker() {
  return render(
    <WeightTrend
      logs={dashboardData.weightLogs}
      initialWeight={dashboardData.user.initialWeight}
      targetWeight={dashboardData.user.targetWeight}
      weeklyTargetWeight={dashboardData.weeklyGoal.targetWeight}
      maxDate="2026-08-12"
    />,
  );
}

describe("WeightTrend", () => {
  it("adds a weight log and recalculates the visible summary", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.type(screen.getByRole("spinbutton", { name: "Berat badan" }), "88.4");
    await user.click(screen.getByRole("button", { name: "Simpan catatan" }));

    expect(screen.getByRole("status")).toHaveTextContent("Catatan 12 Agu ditambahkan");
    expect(screen.getByText("8 catatan")).toBeVisible();
    const latestRow = screen.getByRole("row", { name: /12 Agu 88,4 kg/i });
    expect(within(latestRow).getByText("−0,3 kg")).toBeVisible();
  });

  it("updates an existing date instead of adding a duplicate", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.clear(screen.getByLabelText("Tanggal"));
    await user.type(screen.getByLabelText("Tanggal"), "2026-08-11");
    await user.type(screen.getByRole("spinbutton", { name: "Berat badan" }), "88.5");
    await user.click(screen.getByRole("button", { name: "Simpan catatan" }));

    expect(screen.getByRole("status")).toHaveTextContent("Catatan 11 Agu diperbarui");
    expect(screen.getByText("7 catatan")).toBeVisible();
    expect(screen.getByRole("row", { name: /11 Agu 88,5 kg/i })).toBeVisible();
  });

  it("shows an inline error for an invalid weight", async () => {
    const user = userEvent.setup();
    renderTracker();
    await user.type(screen.getByRole("spinbutton", { name: "Berat badan" }), "10");
    await user.click(screen.getByRole("button", { name: "Simpan catatan" }));
    expect(screen.getByText(/harus antara 30–300 kg/i)).toBeVisible();
  });

  it("describes upward progress for a gain program", () => {
    render(
      <WeightTrend
        logs={[{ date: "2026-08-11", label: "11 Agu", weight: 54 }]}
        initialWeight={52}
        targetWeight={60}
        weeklyTargetWeight={54.5}
        maxDate="2026-08-12"
        goalDirection="gain"
      />,
    );

    expect(screen.getByText(/naik 2,0 kg sejak mulai/i)).toBeVisible();
    expect(screen.getByText("0,5 kg lagi")).toBeVisible();
  });
});
