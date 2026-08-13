import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { getOptionalAuthContext } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Masuk" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getOptionalAuthContext();
  if (context.user) redirect(context.profile ? "/dashboard" : "/onboarding");
  const params = await searchParams;
  const notice = params.reset === "success" ? "Kata sandi berhasil diperbarui. Silakan masuk kembali." : params.error ? "Proses masuk belum berhasil. Coba kembali." : undefined;
  return <LoginForm notice={notice} />;
}
