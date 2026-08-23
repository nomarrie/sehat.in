import type { DashboardData } from "@/features/dashboard/dashboard.types";
import type { ExercisePackage } from "@/features/workouts/workout.types";

const todayPackage: ExercisePackage = {
  id: "latihan-hari-ini",
  name: "Latihan Hari Ini",
  dayLabel: "Senin, 11 Agustus",
  generatedByAi: true,
  difficulty: "Pemula",
  purpose: "Membangun daya tahan dengan gerakan rendah benturan.",
  estimatedMinutes: 28,
  exercises: [
    {
      id: "jalan-di-tempat",
      name: "Jalan di Tempat",
      mode: "timed",
      sets: 1,
      repetitions: null,
      durationSeconds: 120,
      restSeconds: 30,
      order: 1,
      instruction: "Jaga langkah tetap ringan dan bahu rileks.",
    },
    {
      id: "chair-squat",
      name: "Chair Squat",
      mode: "repetitions",
      sets: 3,
      repetitions: 10,
      durationSeconds: null,
      restSeconds: 45,
      order: 2,
      instruction: "Sentuhkan pinggul ke kursi lalu berdiri dengan stabil.",
    },
    {
      id: "wall-push-up",
      name: "Wall Push-Up",
      mode: "repetitions",
      sets: 3,
      repetitions: 8,
      durationSeconds: null,
      restSeconds: 45,
      order: 3,
      instruction: "Pertahankan tubuh lurus saat mendekat ke dinding.",
    },
    {
      id: "knee-raise",
      name: "Low Impact Knee Raise",
      mode: "timed",
      sets: 1,
      repetitions: null,
      durationSeconds: 180,
      restSeconds: 0,
      order: 4,
      instruction: "Angkat lutut bergantian dengan tempo nyaman.",
    },
  ],
};

export const exercisePackages: ExercisePackage[] = [todayPackage];

export function getPackageById(id: string): ExercisePackage | undefined {
  return exercisePackages.find((workoutPackage) => workoutPackage.id === id);
}

export const dashboardData: DashboardData = {
  currentDate: "2026-08-11",
  currentDateLabel: "Senin, 11 Agustus 2026",
  user: {
    name: "Naila",
    initialWeight: 92.4,
    currentWeight: 88.7,
    targetWeight: 72,
  },
  weeklyGoal: {
    startWeight: 89.2,
    currentWeight: 88.7,
    targetWeight: 88.6,
  },
  weightLogs: [
    { date: "2026-06-30", label: "30 Jun", weight: 92.4 },
    { date: "2026-07-07", label: "7 Jul", weight: 91.8 },
    { date: "2026-07-14", label: "14 Jul", weight: 91.2 },
    { date: "2026-07-21", label: "21 Jul", weight: 90.6 },
    { date: "2026-07-28", label: "28 Jul", weight: 89.9 },
    { date: "2026-08-04", label: "4 Agu", weight: 89.2 },
    { date: "2026-08-11", label: "11 Agu", weight: 88.7 },
  ],
  streak: {
    currentDays: 6,
    longestDays: 11,
    activeMinutesToday: 22,
    dailyGoalMinutes: 30,
  },
  latestAchievement: {
    name: "Langkah Konsisten",
    description: "Kamu menyelesaikan latihan selama lima hari berturut-turut.",
    earnedLabel: "Diraih kemarin",
  },
  notification: {
    title: "Ritmemu terjaga",
    message:
      "Target minggu ini hampir tercapai. Lanjutkan dengan latihan ringan hari ini.",
  },
  todayPackage,
};
