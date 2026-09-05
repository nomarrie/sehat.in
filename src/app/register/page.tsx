import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/register-form";
import { getOptionalAuthContext } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Buat akun" };
export default async function RegisterPage() {
  const context = await getOptionalAuthContext();
  if (context.user) redirect(context.profile ? "/dashboard" : "/onboarding");
  return <RegisterForm />;
}
