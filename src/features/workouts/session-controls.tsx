"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { FastForwardIcon } from "@phosphor-icons/react/FastForward";
import { PauseIcon } from "@phosphor-icons/react/Pause";
import { PlayIcon } from "@phosphor-icons/react/Play";
import type { ExercisePackage } from "./workout.types";
import { useWorkoutSession } from "./workout-session-provider";

export function SessionControls({ workoutPackage }: { workoutPackage: ExercisePackage }) {
  const phase = useWorkoutSession((store) => store.session.phase);
  const stepIndex = useWorkoutSession((store) => store.session.stepIndex);
  const steps = useWorkoutSession((store) => store.session.steps);
  const start = useWorkoutSession((store) => store.start);
  const pause = useWorkoutSession((store) => store.pause);
  const resume = useWorkoutSession((store) => store.resume);
  const completeWork = useWorkoutSession((store) => store.completeWork);
  const skipRest = useWorkoutSession((store) => store.skipRest);

  if (phase === "idle") {
    return (
      <div className="session-controls single">
        <button className="button button-primary button-large" type="button" onClick={start}>
          <PlayIcon size={21} weight="fill" aria-hidden="true" />
          Mulai latihan
        </button>
      </div>
    );
  }

  if (phase === "paused") {
    return (
      <div className="session-controls single">
        <button className="button button-primary button-large" type="button" onClick={resume}>
          <PlayIcon size={21} weight="fill" aria-hidden="true" />
          Lanjutkan
        </button>
      </div>
    );
  }

  if (phase === "rest") {
    return (
      <div className="session-controls">
        <button className="button button-secondary" type="button" onClick={pause}>
          <PauseIcon size={19} weight="fill" aria-hidden="true" />
          Jeda
        </button>
        <button className="button button-primary" type="button" onClick={skipRest}>
          Lewati istirahat
          <FastForwardIcon size={19} weight="fill" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (phase !== "exercise") return null;

  const currentStep = steps[stepIndex];
  const orderedExercises = [...workoutPackage.exercises].sort(
    (a, b) => a.order - b.order,
  );
  const exercise =
    currentStep?.kind === "exercise"
      ? orderedExercises[currentStep.exerciseIndex]
      : undefined;
  const completeLabel =
    exercise?.mode === "repetitions" ? "Selesai set" : "Selesai lebih awal";

  return (
    <div className="session-controls">
      <button className="button button-secondary" type="button" onClick={pause}>
        <PauseIcon size={19} weight="fill" aria-hidden="true" />
        Jeda
      </button>
      <button className="button button-primary" type="button" onClick={completeWork}>
        <CheckIcon size={19} weight="bold" aria-hidden="true" />
        {completeLabel}
      </button>
    </div>
  );
}
