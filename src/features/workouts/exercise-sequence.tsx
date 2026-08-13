import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { RepeatIcon } from "@phosphor-icons/react/dist/ssr/Repeat";
import { TimerIcon } from "@phosphor-icons/react/dist/ssr/Timer";
import type { SubExercise } from "./workout.types";

export const formatSeconds = (seconds: number) => {
  if (seconds === 0) return "Tanpa istirahat";
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} menit`;
  return `${seconds} detik`;
};

export function ExerciseSequence({ exercises }: { exercises: SubExercise[] }) {
  return (
    <ol className="exercise-sequence">
      {[...exercises]
        .sort((a, b) => a.order - b.order)
        .map((exercise, index) => (
          <li className={index === 0 ? "is-next" : undefined} key={exercise.id}>
            <div className="exercise-number" aria-hidden="true">
              {String(exercise.order).padStart(2, "0")}
            </div>
            <div className="exercise-content">
              <div className="exercise-heading-row">
                <div>
                  {index === 0 && <span className="next-label">Mulai dari sini</span>}
                  <h2>{exercise.name}</h2>
                </div>
                <span className="exercise-mode">
                  {exercise.mode === "timed" ? (
                    <TimerIcon size={18} weight="regular" aria-hidden="true" />
                  ) : (
                    <RepeatIcon size={18} weight="regular" aria-hidden="true" />
                  )}
                  {exercise.mode === "timed" ? "Durasi" : "Repetisi"}
                </span>
              </div>
              <p className="exercise-instruction">{exercise.instruction}</p>
              <div className="exercise-facts">
                <span><RepeatIcon size={17} weight="regular" aria-hidden="true" />{exercise.sets} set</span>
                <span>
                  {exercise.mode === "repetitions"
                    ? `${exercise.repetitions} repetisi`
                    : formatSeconds(exercise.durationSeconds ?? 0)}
                </span>
                <span><ClockIcon size={17} weight="regular" aria-hidden="true" />Istirahat {formatSeconds(exercise.restSeconds).toLowerCase()}</span>
              </div>
            </div>
          </li>
        ))}
    </ol>
  );
}
