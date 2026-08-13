import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { dashboardData } from "@/data/mock-data";
import { DashboardOverview } from "./dashboard-overview";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({
  recordWeightAction: async () => ({ ok: true, message: "Berat tersimpan." }),
}));

describe("DashboardOverview", () => {
  it("shows the weekly status and a route to today's package", () => {
    render(<DashboardOverview data={dashboardData} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /selamat pagi, naila/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/83% target minggu ini/i)).toBeInTheDocument();
    expect(screen.getByText(/22 dari 30 menit/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /buka latihan hari ini/i }),
    ).toHaveAttribute("href", "/packages/latihan-hari-ini");
  });

  it("shows an actionable empty state when no package exists", () => {
    render(<DashboardOverview data={{ ...dashboardData, todayPackage: null }} />);
    expect(
      screen.getByRole("heading", { name: /belum ada latihan hari ini/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /buka latihan hari ini/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /lihat paket contoh/i }),
    ).toHaveAttribute("href", "/packages/latihan-hari-ini");
  });
});
