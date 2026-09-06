import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Pulihkan kata sandi" };
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
