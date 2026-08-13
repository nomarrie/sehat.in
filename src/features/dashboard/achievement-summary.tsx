import { MedalIcon } from "@phosphor-icons/react/dist/ssr/Medal";
import type { Achievement } from "./dashboard.types";

export function AchievementSummary({ achievement }: { achievement: Achievement }) {
  return (
    <section className="dashboard-module achievement-summary" aria-labelledby="achievement-title">
      <div className="achievement-medal" aria-hidden="true">
        <MedalIcon size={30} weight="regular" />
      </div>
      <div>
        <p className="module-kicker">Pencapaian terbaru</p>
        <h2 id="achievement-title">{achievement.name}</h2>
        <p>{achievement.description}</p>
        <small>{achievement.earnedLabel}</small>
      </div>
    </section>
  );
}
