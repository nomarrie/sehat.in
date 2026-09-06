"use client";

import { ClockCountdownIcon } from "@phosphor-icons/react/ClockCountdown";
import { PauseIcon } from "@phosphor-icons/react/Pause";
import type { ExercisePackage } from "./workout.types";
import { useWorkoutSession } from "./workout-session-provider";

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function SessionTimer({ workoutPackage }: { workoutPackage: ExercisePackage }) {
  const phase = useWorkoutSession((store) => store.session.phase);
  const pausedPhase = useWorkoutSession((store) => store.session.pausedPhase);
  const steps = useWorkoutSession((store) => store.session.steps);
  const stepIndex = useWorkoutSession((store) => store.session.stepIndex);
  const remainingMs = useWorkoutSession((store) => store.session.remainingMs);

  const orderedExercises = [...workoutPackage.exercises].sort(
    (a, b) => a.order - b.order,
  );
  const currentStep = steps[stepIndex];
  const effectivePhase = phase === "paused" ? pausedPhase : phase;

  if (phase === "idle") {
    return (
      <section className="session-card session-intro" aria-labelledby="session-ready-title">
        <span className="session-intro-icon" aria-hidden="true">
          <ClockCountdownIcon size={32} weight="regular" />
        </span>
        <p className="module-kicker">Sesi terpandu</p>
        <h2 id="session-ready-title">Siapkan ruang untuk bergerak</h2>
        <p>
          Ikuti setiap gerakan sesuai urutan. Kamu bisa menjeda sesi kapan pun
          dibutuhkan.
        </p>
        <dl className="session-intro-facts">
          <div><dt>Perkiraan</dt><dd>{workoutPackage.estimatedMinutes} menit</dd></div>
          <div><dt>Gerakan</dt><dd>{workoutPackage.exercises.length} latihan</dd></div>
          <div><dt>Level</dt><dd>{workoutPackage.difficulty}</dd></div>
        </dl>
      </section>
    );
  }

  if (!currentStep || effectivePhase === null) return null;

  if (effectivePhase === "rest" && currentStep.kind === "rest") {
    const nextWorkStep = steps
      .slice(stepIndex + 1)
      .find((step) => step.kind === "exercise");
    const nextExercise =
      nextWorkStep?.kind === "exercise"
        ? orderedExercises[nextWorkStep.exerciseIndex]
        : undefined;
    const seconds = Math.ceil((remainingMs ?? 0) / 1000);

    return (
      <section className="session-card timer-card rest-card session-transition">
        <div className="phase-label">
          <ClockCountdownIcon size={20} weight="regular" aria-hidden="true" />
          Waktu istirahat
        </div>
        <div className="timer-value" role="timer" aria-label="Istirahat, waktu tersisa">
          {formatClock(seconds)}
        </div>
        {phase === "paused" && (
          <span className="paused-badge">
            <PauseIcon size={15} weight="fill" aria-hidden="true" /> Dijeda
          </span>
        )}
        {nextExercise && (
          <div className="next-exercise">
            <span>Berikutnya</span>
            <strong>{nextExercise.name}</strong>
            <p>{nextExercise.instruction}</p>
          </div>
        )}
      </section>
    );
  }

  if (currentStep.kind !== "exercise") return null;

  const exercise = orderedExercises[currentStep.exerciseIndex];
  if (!exercise) return null;
  const seconds = Math.ceil((remainingMs ?? 0) / 1000);
  const isOverdue =
    exercise.mode === "timed" &&
    remainingMs !== null &&
    remainingMs <= 0;
  const timerText = isOverdue
    ? `-${formatClock(Math.ceil(Math.abs(remainingMs) / 1000))}`
    : formatClock(seconds);

  return (
    <section className="session-card timer-card exercise-card session-transition">
      <div className="phase-label">
        Gerakan {currentStep.exerciseIndex + 1} dari {orderedExercises.length}
      </div>
      <p className="set-label">Set {currentStep.setIndex + 1} dari {exercise.sets}</p>
      <h2>{exercise.name}</h2>
      <p className="active-instruction">{exercise.instruction}</p>

      <div
        className={
          exercise.mode === "timed"
            ? `timer-value${isOverdue ? " is-overdue" : ""}`
            : "repetition-value"
        }
        role="timer"
        aria-label={
          exercise.mode === "timed"
            ? `${exercise.name}, ${isOverdue ? "waktu terlampaui" : "waktu tersisa"}`
            : `${exercise.name}, target gerakan`
        }
      >
        {exercise.mode === "timed"
          ? timerText
          : `${exercise.repetitions} repetisi`}
      </div>

      {phase === "paused" && (
        <span className="paused-badge">
          <PauseIcon size={15} weight="fill" aria-hidden="true" /> Dijeda
        </span>
      )}
    </section>
  );
}
