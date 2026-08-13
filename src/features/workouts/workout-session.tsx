"use client";

import { useEffect } from "react";
import type { ExercisePackage } from "./workout.types";
import { ExitSessionDialog } from "./exit-session-dialog";
import { SessionCompletion } from "./session-completion";
import { SessionControls } from "./session-controls";
import { SessionTimer } from "./session-timer";
import { useWorkoutSession } from "./workout-session-provider";

const phaseAnnouncements = {
  idle: "Siap memulai latihan.",
  exercise: "Latihan dimulai.",
  rest: "Waktu istirahat dimulai.",
  paused: "Latihan dijeda.",
  completed: "Sesi selesai.",
} as const;

export function WorkoutSession({ workoutPackage }: { workoutPackage: ExercisePackage }) {
  const phase = useWorkoutSession((store) => store.session.phase);
  const stepIndex = useWorkoutSession((store) => store.session.stepIndex);
  const steps = useWorkoutSession((store) => store.session.steps);
  const tick = useWorkoutSession((store) => store.tick);

  useEffect(() => {
    if (phase !== "exercise" && phase !== "rest") return;

    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [phase, tick]);

  if (phase === "completed") {
    return <SessionCompletion workoutPackage={workoutPackage} />;
  }

  const workSteps = steps.filter((step) => step.kind === "exercise");
  const completedWorkSteps = steps
    .slice(0, Math.max(0, stepIndex))
    .filter((step) => step.kind === "exercise").length;
  const currentWorkNumber = Math.min(
    workSteps.length,
    phase === "idle" ? 0 : completedWorkSteps + (steps[stepIndex]?.kind === "exercise" ? 1 : 0),
  );
  const progress =
    workSteps.length === 0
      ? 0
      : Math.round((completedWorkSteps / workSteps.length) * 100);

  return (
    <main className="session-layout">
      <header className="session-header">
        <div>
          <p>{workoutPackage.dayLabel}</p>
          <h1>{workoutPackage.name}</h1>
        </div>
        <ExitSessionDialog packageId={workoutPackage.id} />
      </header>

      <section className="session-progress" aria-label="Progres sesi">
        <div>
          <span>Progres sesi</span>
          <strong>
            {currentWorkNumber} dari {workSteps.length} set
          </strong>
        </div>
        <div className="progress-track small" aria-hidden="true">
          <span style={{ inlineSize: `${progress}%` }} />
        </div>
      </section>

      <SessionTimer workoutPackage={workoutPackage} />
      <SessionControls workoutPackage={workoutPackage} />

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {phaseAnnouncements[phase]}
      </p>
      <p className="session-demo-note">Waktu aktif disimpan setelah seluruh rangkaian selesai.</p>
    </main>
  );
}
