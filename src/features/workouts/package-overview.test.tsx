import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getPackageById } from "@/data/mock-data";
import { PackageOverview } from "./package-overview";

describe("PackageOverview", () => {
  it("shows package context and the exercises in planned order", () => {
    const workoutPackage = getPackageById("latihan-hari-ini");
    if (!workoutPackage) throw new Error("Fixture package is required for this test");

    render(<PackageOverview workoutPackage={workoutPackage} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Latihan Hari Ini" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/28 menit/i)).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Jalan di Tempat")).toBeInTheDocument();
    expect(
      within(items[3]).getByText("Low Impact Knee Raise"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mulai sesi/i })).toHaveAttribute(
      "href",
      "/packages/latihan-hari-ini/session",
    );
  });
});
