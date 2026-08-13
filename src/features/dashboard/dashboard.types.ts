import type { ExercisePackage } from "@/features/workouts/workout.types";

export type WeightLog = {
  date: string;
  label: string;
  weight: number;
};

export type WeeklyGoal = {
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
};

export type StreakSummary = {
  currentDays: number;
  longestDays: number;
  activeMinutesToday: number;
  dailyGoalMinutes: 30;
};

export type Achievement = {
  name: string;
  description: string;
  earnedLabel: string;
};

export type ProgressNotification = {
  title: string;
  message: string;
};

export type DashboardData = {
  currentDate: string;
  currentDateLabel: string;
  user: {
    name: string;
    initialWeight: number;
    currentWeight: number;
    targetWeight: number;
  };
  weeklyGoal: WeeklyGoal;
  weightLogs: WeightLog[];
  streak: StreakSummary;
  latestAchievement: Achievement | null;
  notification: ProgressNotification | null;
  todayPackage: ExercisePackage | null;
};
