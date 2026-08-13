import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadExercisePackage } from "@/lib/sehatin/queries";
import { WorkoutSession } from "@/features/workouts/workout-session";
import { WorkoutSessionProvider } from "@/features/workouts/workout-session-provider";

export const metadata: Metadata = { title: "Sesi latihan" };

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const workoutPackage = await loadExercisePackage(packageId);
  if (!workoutPackage) notFound();

  return (
    <WorkoutSessionProvider workoutPackage={workoutPackage}>
      <WorkoutSession workoutPackage={workoutPackage} />
    </WorkoutSessionProvider>
  );
}
