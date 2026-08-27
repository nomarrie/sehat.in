import type { DashboardData } from "./dashboard.types";
import { calculateWeeklyProgress } from "./progress";
import { AchievementSummary } from "./achievement-summary";
import { EmptyDashboard } from "./empty-dashboard";
import { LocalTimeGreeting } from "./local-time-greeting";
import { ProgressNotice } from "./progress-notice";
import { StreakSummary } from "./streak-summary";
import { TodayWorkout } from "./today-workout";
import { WeeklyTarget } from "./weekly-target";
import { WeightTrend } from "./weight-trend";

export function DashboardOverview({ data }: { data: DashboardData }) {
  const weeklyProgress = calculateWeeklyProgress(data.weeklyGoal);
  return (
    <div className="dashboard-layout">
      <header className="dashboard-heading">
        <div>
          <p className="date-label">{data.currentDateLabel}</p>
          <LocalTimeGreeting name={data.user.name} />
        </div>
        <p>Fokus pada satu langkah yang bisa kamu selesaikan hari ini.</p>
      </header>

      <WeeklyTarget goal={data.weeklyGoal} progress={weeklyProgress} />
      {data.todayPackage ? (
        <TodayWorkout workoutPackage={data.todayPackage} />
      ) : (
        <EmptyDashboard />
      )}
      <StreakSummary streak={data.streak} />
      <WeightTrend
        logs={data.weightLogs}
        initialWeight={data.user.initialWeight}
        targetWeight={data.user.targetWeight}
        weeklyTargetWeight={data.weeklyGoal.targetWeight}
        maxDate={data.currentDate}
      />
      {data.latestAchievement ? <AchievementSummary achievement={data.latestAchievement} /> : null}
      {data.notification ? <ProgressNotice notification={data.notification} /> : null}
    </div>
  );
}
