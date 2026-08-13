import { FireIcon } from "@phosphor-icons/react/dist/ssr/Fire";
import type { StreakSummary as StreakSummaryType } from "./dashboard.types";

export function StreakSummary({ streak }: { streak: StreakSummaryType }) {
  const dailyProgress = Math.min(
    100,
    Math.round((streak.activeMinutesToday / streak.dailyGoalMinutes) * 100),
  );

  return (
    <section className="dashboard-module streak-summary" aria-labelledby="streak-title">
      <div className="module-heading compact">
        <div className="module-icon warm" aria-hidden="true">
          <FireIcon size={22} weight="fill" />
        </div>
        <div>
          <p className="module-kicker">Streak aktif</p>
          <h2 id="streak-title">{streak.currentDays} hari konsisten</h2>
        </div>
      </div>

      <div className="streak-goal">
        <div>
          <strong>{streak.activeMinutesToday}</strong>
          <span>dari {streak.dailyGoalMinutes} menit</span>
        </div>
        <span className="progress-percent">{dailyProgress}%</span>
      </div>
      <p className="visually-hidden">
        {streak.activeMinutesToday} dari {streak.dailyGoalMinutes} menit
      </p>
      <div className="progress-track small" aria-hidden="true">
        <span style={{ inlineSize: `${dailyProgress}%` }} />
      </div>
      <p>Tambah 8 menit aktivitas untuk menjaga streak hari ini.</p>
      <small>Rekor terpanjang: {streak.longestDays} hari</small>
    </section>
  );
}
