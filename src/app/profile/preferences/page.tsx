import type { Metadata } from "next";
import { AppShell } from "@/components/navigation/app-shell";
import { SettingsForm } from "@/features/settings/settings-form";
import { loadProfileSettings } from "@/lib/sehatin/queries";

export const metadata: Metadata = { title: "Preferensi pribadi" };
export default async function PreferencesPage() {
  const profileSettings = await loadProfileSettings();
  return <AppShell activePath="/profile"><SettingsForm initialSettings={profileSettings} mode="preferences" /></AppShell>;
}
