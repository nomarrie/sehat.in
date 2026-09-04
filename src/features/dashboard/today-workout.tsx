import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { OriginLink } from "@/components/ui/origin-button";
import type { ExercisePackage } from "@/features/workouts/workout.types";

export function TodayWorkout({ workoutPackage }: { workoutPackage: ExercisePackage }) {
  return (
    <section className="dashboard-module today-workout" aria-labelledby="today-workout-title">
      <div className="workout-topline">
        <span className="status-chip">
          <span aria-hidden="true" /> Siap dimulai
        </span>
        <span>{workoutPackage.difficulty}</span>
      </div>

      <div className="today-workout-copy">
        <div className="module-icon inverse" aria-hidden="true">
          <BarbellIcon size={25} weight="regular" />
        </div>
        <p className="module-kicker">Latihan hari ini</p>
        <h2 id="today-workout-title">{workoutPackage.name}</h2>
        <p>{workoutPackage.purpose}</p>
      </div>

      <div className="workout-meta">
        <span>
          <ClockIcon size={18} weight="regular" aria-hidden="true" />
          {workoutPackage.estimatedMinutes} menit
        </span>
        <span>{workoutPackage.exercises.length} gerakan</span>
      </div>

      <OriginLink className="mt-auto w-full" href={`/packages/${workoutPackage.id}`}>
        Buka latihan hari ini
        <ArrowRightIcon size={19} weight="regular" aria-hidden="true" />
      </OriginLink>
    </section>
  );
}
