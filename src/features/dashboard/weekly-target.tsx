import { TargetIcon } from "@phosphor-icons/react/dist/ssr/Target";
import { TrendDownIcon } from "@phosphor-icons/react/dist/ssr/TrendDown";
import type { WeeklyGoal } from "./dashboard.types";

export function WeeklyTarget({ goal, progress }: { goal: WeeklyGoal; progress: number }) {
  const remaining = Math.max(0, goal.currentWeight - goal.targetWeight).toFixed(1);

  return (
    <section className="dashboard-module weekly-target" aria-labelledby="weekly-target-title">
      <div className="module-heading">
        <div className="module-icon" aria-hidden="true">
          <TargetIcon size={22} weight="regular" />
        </div>
        <div>
          <p className="module-kicker">Target mingguan</p>
          <h2 id="weekly-target-title">{progress}% target minggu ini</h2>
        </div>
      </div>

      <div className="progress-track" aria-hidden="true">
        <span style={{ inlineSize: `${progress}%` }} />
      </div>
      <p className="visually-hidden">Progres target mingguan {progress} persen.</p>

      <div className="weekly-values">
        <div>
          <span>Awal minggu</span>
          <strong>{goal.startWeight.toFixed(1)} kg</strong>
        </div>
        <TrendDownIcon size={24} weight="regular" aria-hidden="true" />
        <div>
          <span>Saat ini</span>
          <strong>{goal.currentWeight.toFixed(1)} kg</strong>
        </div>
        <div className="target-value">
          <span>Target</span>
          <strong>{goal.targetWeight.toFixed(1)} kg</strong>
        </div>
      </div>

      <p className="supporting-line">
        Tinggal {remaining} kg lagi. Pertahankan ritme yang terasa nyaman.
      </p>
    </section>
  );
}
