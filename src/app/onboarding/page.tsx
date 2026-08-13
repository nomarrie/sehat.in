import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/auth/onboarding-form";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Siapkan program" };
export default async function OnboardingPage() {
  const { user, profile } = await requireUser();
  if (profile) redirect("/dashboard");
  const defaultName = typeof user.profile?.name === "string" ? user.profile.name : "";
  return <main className="onboarding-layout"><header className="onboarding-heading"><span className="eyebrow">Penyiapan awal</span><h1>Kenali titik awalmu</h1><p>Data ini digunakan untuk menyusun target dan rencana bertahap. Kamu tetap dapat memperbaruinya nanti.</p></header><OnboardingForm defaultName={defaultName} /></main>;
}
