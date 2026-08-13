import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/navigation/app-shell";
import { PackageOverview } from "@/features/workouts/package-overview";
import { loadExercisePackage } from "@/lib/sehatin/queries";

export const metadata: Metadata = { title: "Paket latihan" };

export default async function PackagePage({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  const workoutPackage = await loadExercisePackage(packageId);
  if (!workoutPackage) notFound();

  return (
    <AppShell activePath="/packages">
      <PackageOverview workoutPackage={workoutPackage} />
    </AppShell>
  );
}
