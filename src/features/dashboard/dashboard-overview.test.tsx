import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardData } from "@/data/mock-data";
import { DashboardOverview } from "./dashboard-overview";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({
  recordWeightAction: async () => ({ ok: true, message: "Berat tersimpan." }),
}));

afterEach(() => {
  vi.useRealTimers();
});

describe("DashboardOverview", () => {
  it("shows the weekly status and a route to today's package", () => {
    render(<DashboardOverview data={dashboardData} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /selamat (pagi|siang|sore|malam), naila/i,
      }),
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

  it.each([
    [5, "Selamat pagi, Naila"],
    [11, "Selamat siang, Naila"],
    [15, "Selamat sore, Naila"],
    [18, "Selamat malam, Naila"],
  ])("uses the user's local greeting at %i:00", (hour, greeting) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 27, hour));

    render(<DashboardOverview data={dashboardData} />);

    expect(
      screen.getByRole("heading", { level: 1, name: greeting }),
    ).toBeInTheDocument();
  });
});
