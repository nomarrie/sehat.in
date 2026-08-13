import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Pulihkan kata sandi" };
export default function ResetPasswordPage() {
  return <AuthShell title="Pulihkan akses akun" description="Kami akan mengirim kode singkat untuk membuat kata sandi baru." alternate={{ label: "Sudah ingat kata sandi?", href: "/login", action: "Kembali masuk" }}><ResetPasswordForm /></AuthShell>;
}
