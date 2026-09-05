import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPackageById } from "@/data/mock-data";
import type { ExercisePackage } from "./workout.types";
import { WorkoutSession } from "./workout-session";
import { WorkoutSessionProvider } from "./workout-session-provider";

const completeWorkoutActionMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("./actions", () => ({
  completeWorkoutAction: completeWorkoutActionMock,
}));

const singleExercisePackage: ExercisePackage = {
  id: "sesi-singkat",
  name: "Sesi Singkat",
  dayLabel: "Hari ini",
  generatedByAi: false,
  difficulty: "Pemula",
  purpose: "Menguji penyelesaian sesi.",
  estimatedMinutes: 1,
  exercises: [
    {
      id: "angkat-tangan",
      name: "Angkat Tangan",
      mode: "repetitions",
      sets: 1,
      repetitions: 5,
      durationSeconds: null,
      restSeconds: 0,
      order: 1,
      instruction: "Angkat tangan dengan gerakan nyaman.",
    },
  ],
};

describe("WorkoutSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T08:00:00+08:00"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    completeWorkoutActionMock.mockReset();
    completeWorkoutActionMock.mockResolvedValue({
      ok: true,
      message: "Latihan tersimpan.",
      newBadges: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts, pauses, and resumes without counting down while paused", async () => {
    const workoutPackage = getPackageById("latihan-hari-ini");
    if (!workoutPackage) throw new Error("Fixture package is required for this test");
    render(
      <WorkoutSessionProvider workoutPackage={workoutPackage}>
        <WorkoutSession workoutPackage={workoutPackage} />
      </WorkoutSessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /mulai latihan/i }));
    expect(screen.getByRole("timer")).toHaveTextContent("02:00");

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("timer")).toHaveTextContent("01:59");

    fireEvent.click(screen.getByRole("button", { name: /jeda/i }));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("timer")).toHaveTextContent("01:59");

    fireEvent.click(screen.getByRole("button", { name: /lanjutkan/i }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("timer")).toHaveTextContent("01:58");
  });

  it("opens a named exit confirmation dialog", async () => {
    const workoutPackage = getPackageById("latihan-hari-ini");
    if (!workoutPackage) throw new Error("Fixture package is required for this test");
    render(
      <WorkoutSessionProvider workoutPackage={workoutPackage}>
        <WorkoutSession workoutPackage={workoutPackage} />
      </WorkoutSessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /keluar dari sesi/i }));
    expect(
      screen.getByRole("dialog", { name: /keluar dari sesi/i }),
    ).toBeInTheDocument();
  });

  it("moves from early completion through rest to the repetition target", async () => {
    const workoutPackage = getPackageById("latihan-hari-ini");
    if (!workoutPackage) throw new Error("Fixture package is required for this test");
    render(
      <WorkoutSessionProvider workoutPackage={workoutPackage}>
        <WorkoutSession workoutPackage={workoutPackage} />
      </WorkoutSessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /mulai latihan/i }));
    fireEvent.click(screen.getByRole("button", { name: /selesai lebih awal/i }));
    expect(screen.getByRole("timer")).toHaveAccessibleName(/istirahat/i);
    fireEvent.click(screen.getByRole("button", { name: /lewati istirahat/i }));
    expect(screen.getByText("10 repetisi")).toBeInTheDocument();
  });

  it("shows completion navigation after the final repetition set", async () => {
    render(
      <WorkoutSessionProvider workoutPackage={singleExercisePackage}>
        <WorkoutSession workoutPackage={singleExercisePackage} />
      </WorkoutSessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /mulai latihan/i }));
    fireEvent.click(screen.getByRole("button", { name: /selesai set/i }));
    expect(
      screen.getByRole("heading", { name: /sesi selesai/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /kembali ke dashboard/i }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("automatically retries an idempotent save after the session is refreshed", async () => {
    completeWorkoutActionMock
      .mockResolvedValueOnce({
        ok: false,
        code: "session_expired",
        message: "Sesi kamu sudah berakhir. Silakan masuk kembali.",
      })
      .mockResolvedValueOnce({
        ok: true,
        message: "Sesi tersimpan.",
        newBadges: [],
      });

    render(
      <WorkoutSessionProvider workoutPackage={singleExercisePackage}>
        <WorkoutSession workoutPackage={singleExercisePackage} />
      </WorkoutSessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /mulai latihan/i }));
    fireEvent.click(screen.getByRole("button", { name: /selesai set/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(completeWorkoutActionMock).toHaveBeenCalledTimes(2);
    expect(completeWorkoutActionMock.mock.calls[1]?.[0].clientCompletionId).toBe(
      completeWorkoutActionMock.mock.calls[0]?.[0].clientCompletionId,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Sesi tersimpan.");
  });

  it("refreshes the access token before saving a completed workout", async () => {
    render(
      <WorkoutSessionProvider workoutPackage={singleExercisePackage}>
        <WorkoutSession workoutPackage={singleExercisePackage} />
      </WorkoutSessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /mulai latihan/i }));
    fireEvent.click(screen.getByRole("button", { name: /selesai set/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    expect(vi.mocked(fetch).mock.invocationCallOrder[0]).toBeLessThan(
      completeWorkoutActionMock.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(completeWorkoutActionMock).toHaveBeenCalledOnce();
  });

  it("announces a phase change without making the timer live", async () => {
    render(
      <WorkoutSessionProvider workoutPackage={singleExercisePackage}>
        <WorkoutSession workoutPackage={singleExercisePackage} />
      </WorkoutSessionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /mulai latihan/i }));
    expect(screen.getByText(/latihan dimulai/i)).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.getByRole("timer")).not.toHaveAttribute("aria-live");
  });
});
