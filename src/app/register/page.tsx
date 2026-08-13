import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";
import { getOptionalAuthContext } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Buat akun" };
export default async function RegisterPage() {
  const context = await getOptionalAuthContext();
  if (context.user) redirect(context.profile ? "/dashboard" : "/onboarding");
  return <AuthShell title="Mulai dengan satu langkah" description="Buat akun privat untuk menyimpan progres, latihan, streak, dan rekomendasi makananmu." alternate={{ label: "Sudah punya akun?", href: "/login", action: "Masuk" }}><RegisterForm /></AuthShell>;
}
