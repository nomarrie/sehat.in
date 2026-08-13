import type { Metadata } from "next";
import { AppShell } from "@/components/navigation/app-shell";
import { ProfileOverview } from "@/features/profile/profile-overview";
import { loadProfileSettings } from "@/lib/sehatin/queries";

export const metadata: Metadata = { title: "Profil" };
export default async function ProfilePage() {
  const profileSettings = await loadProfileSettings();
  return <AppShell activePath="/profile"><ProfileOverview profile={profileSettings} /></AppShell>;
}
