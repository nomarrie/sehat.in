import { describe, expect, it } from "vitest";
import type { ExercisePackage } from "./workout.types";
import {
  createInitialSessionState,
  transitionSession,
} from "./session-machine";

const shortPackage: ExercisePackage = {
  id: "test-package",
  name: "Sesi Uji",
  dayLabel: "Hari ini",
  generatedByAi: false,
  difficulty: "Pemula",
  purpose: "Menguji alur sesi.",
  estimatedMinutes: 1,
  exercises: [
    {
      id: "timed",
      name: "Gerak Waktu",
      mode: "timed",
      sets: 1,
      repetitions: null,
      durationSeconds: 2,
      restSeconds: 1,
      order: 1,
      instruction: "Bergerak.",
    },
    {
      id: "reps",
      name: "Gerak Repetisi",
      mode: "repetitions",
      sets: 1,
      repetitions: 5,
      durationSeconds: null,
      restSeconds: 0,
      order: 2,
      instruction: "Ulangi.",
    },
  ],
};

describe("workout session machine", () => {
  it("moves from timed work through rest and repetition work to completion", () => {
    let state = createInitialSessionState(shortPackage);
    state = transitionSession(state, { type: "START", nowMs: 0 });
    expect(state).toMatchObject({
      phase: "exercise",
      stepIndex: 0,
      remainingMs: 2000,
    });

    state = transitionSession(state, { type: "TICK", nowMs: 2000 });
    expect(state).toMatchObject({
      phase: "rest",
      stepIndex: 1,
      remainingMs: 1000,
    });

    state = transitionSession(state, { type: "TICK", nowMs: 3000 });
    expect(state).toMatchObject({
      phase: "exercise",
      stepIndex: 2,
      remainingMs: null,
    });

    state = transitionSession(state, { type: "COMPLETE_WORK", nowMs: 4000 });
    expect(state).toMatchObject({
      phase: "completed",
      activeElapsedMs: 3000,
      completedAtMs: 4000,
    });
  });

  it("freezes a timed exercise while paused and resumes from the stored remainder", () => {
    let state = createInitialSessionState(shortPackage);
    state = transitionSession(state, { type: "START", nowMs: 1000 });
    state = transitionSession(state, { type: "TICK", nowMs: 1500 });
    state = transitionSession(state, { type: "PAUSE", nowMs: 1500 });
    const pausedRemaining = state.remainingMs;

    state = transitionSession(state, { type: "TICK", nowMs: 9000 });
    expect(state.remainingMs).toBe(pausedRemaining);
    expect(state.phase).toBe("paused");

    state = transitionSession(state, { type: "RESUME", nowMs: 9000 });
    expect(state.phase).toBe("exercise");
    expect(state.deadlineMs).toBe(9000 + (pausedRemaining ?? 0));
  });

  it("skips rest directly to the next exercise", () => {
    let state = createInitialSessionState(shortPackage);
    state = transitionSession(state, { type: "START", nowMs: 0 });
    state = transitionSession(state, { type: "COMPLETE_WORK", nowMs: 500 });
    state = transitionSession(state, { type: "SKIP_REST", nowMs: 600 });
    expect(state).toMatchObject({ phase: "exercise", stepIndex: 2 });
  });

  it("completes immediately when a package contains no work", () => {
    const empty = createInitialSessionState({ ...shortPackage, exercises: [] });
    expect(
      transitionSession(empty, { type: "START", nowMs: 25 }),
    ).toMatchObject({ phase: "completed", completedAtMs: 25 });
  });

  it("places rest between two sets without a trailing rest", () => {
    const twoSets = createInitialSessionState({
      ...shortPackage,
      exercises: [{ ...shortPackage.exercises[0], sets: 2 }],
    });
    expect(twoSets.steps.map((step) => step.kind)).toEqual([
      "exercise",
      "rest",
      "exercise",
    ]);
  });

  it("resets accumulated session progress", () => {
    let state = createInitialSessionState(shortPackage);
    state = transitionSession(state, { type: "START", nowMs: 0 });
    state = transitionSession(state, { type: "TICK", nowMs: 500 });
    state = transitionSession(state, { type: "RESET" });
    expect(state).toMatchObject({
      phase: "idle",
      stepIndex: -1,
      activeElapsedMs: 0,
    });
  });

  it("ignores pause while the session is idle", () => {
    const state = createInitialSessionState(shortPackage);
    expect(transitionSession(state, { type: "PAUSE", nowMs: 100 })).toEqual(
      state,
    );
  });
});
