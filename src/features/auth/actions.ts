"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getInsForgeConfig } from "@/lib/insforge/config";
import { getBackendErrorMessage } from "@/lib/insforge/errors";
import {
  getAuthCookieOptions,
  getRememberMeCookieOptions,
  REMEMBER_ME_COOKIE,
} from "@/lib/insforge/auth-session";
import {
  onboardingSchema,
  signInSchema,
  signUpSchema,
  verificationSchema,
  type AuthFormState,
} from "./auth-validation";

function fieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors;
}

export async function signInAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Periksa kembali data masuk kamu." };

  const cookieStore = await cookies();
  const auth = createAuthActions({
    ...getInsForgeConfig(),
    cookies: cookieStore,
    options: getAuthCookieOptions(parsed.data.rememberMe),
  });
  const { error } = await auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { message: getBackendErrorMessage(error, "Email atau kata sandi tidak sesuai.") };

  if (parsed.data.rememberMe) {
    cookieStore.set(REMEMBER_ME_COOKIE, "1", getRememberMeCookieOptions());
  } else {
    cookieStore.delete(REMEMBER_ME_COOKIE);
  }
  redirect("/dashboard");
}

export async function signUpAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Periksa kembali data pendaftaran kamu." };

  const auth = createAuthActions({ ...getInsForgeConfig(), cookies: await cookies() });
  const { data, error } = await auth.signUp({ ...parsed.data, redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login` });
  if (error) return { message: getBackendErrorMessage(error, "Akun belum dapat dibuat. Coba lagi sebentar.") };
  if (data?.requireEmailVerification) {
    return { verificationEmail: parsed.data.email, message: "Kami mengirim kode 6 digit ke email kamu." };
  }
  redirect("/onboarding");
}

export async function verifyEmailAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = verificationSchema.safeParse({ email: formData.get("email"), otp: formData.get("otp") });
  if (!parsed.success) return { verificationEmail: String(formData.get("email") ?? ""), errors: fieldErrors(parsed.error), message: "Kode verifikasi belum valid." };
  const auth = createAuthActions({ ...getInsForgeConfig(), cookies: await cookies() });
  const { error } = await auth.verifyEmail(parsed.data);
  if (error) return { verificationEmail: parsed.data.email, message: getBackendErrorMessage(error, "Kode tidak valid atau sudah kedaluwarsa.") };
  redirect("/onboarding");
}

export async function initiateOAuth(provider: string) {
  if (!new Set(["google", "facebook"]).has(provider)) redirect("/login?error=provider");
  const cookieStore = await cookies();
  const auth = createAuthActions({ ...getInsForgeConfig(), cookies: cookieStore });
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/callback`;
  const { data, error } = await auth.signInWithOAuth(provider, { redirectTo: callbackUrl, skipBrowserRedirect: true });
  if (error || !data.url || !data.codeVerifier) redirect("/login?error=oauth");
  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
  });
  redirect(data.url);
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const auth = createAuthActions({ ...getInsForgeConfig(), cookies: cookieStore });
  await auth.signOut();
  cookieStore.delete(REMEMBER_ME_COOKIE);
  redirect("/login");
}

export async function completeOnboardingAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName"), age: formData.get("age"), heightCm: formData.get("heightCm"),
    initialWeightKg: formData.get("initialWeightKg"), targetWeightKg: formData.get("targetWeightKg"),
    weeklyTargetKg: formData.get("weeklyTargetKg"), activityLevel: formData.get("activityLevel"), mealPreference: formData.get("mealPreference"),
    aiProcessingConsent: formData.get("aiProcessingConsent"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Periksa kembali data program kamu." };

  const client = await createInsForgeServerClient();
  const onboarding = await client.functions.invoke("sehatin-program", { body: {
    action: "complete-onboarding",
    requestId: crypto.randomUUID(),
    fullName: parsed.data.fullName,
    age: parsed.data.age,
    heightCm: parsed.data.heightCm,
    initialWeightKg: parsed.data.initialWeightKg,
    targetWeightKg: parsed.data.targetWeightKg,
    weeklyTargetKg: parsed.data.weeklyTargetKg,
    activityLevel: parsed.data.activityLevel,
    mealPreference: parsed.data.mealPreference,
    reminderEnabled: true,
    reminderTime: "18:30",
    weeklySummaryEnabled: true,
    timeZone: "Asia/Makassar",
    aiProcessingConsent: parsed.data.aiProcessingConsent,
  } });
  if (onboarding.error) return { message: getBackendErrorMessage(onboarding.error, "Data program dan rencana awal belum dapat disimpan.") };
  redirect("/dashboard");
}

export async function requestPasswordResetAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const emailResult = signInSchema.shape.email.safeParse(formData.get("email"));
  if (!emailResult.success) return { errors: { email: [emailResult.error.issues[0]?.message ?? "Email tidak valid."] } };
  const client = await createInsForgeServerClient();
  const { error } = await client.auth.sendResetPasswordEmail({ email: emailResult.data, redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password` });
  return error
    ? { message: getBackendErrorMessage(error, "Kode pemulihan belum dapat dikirim.") }
    : { verificationEmail: emailResult.data, message: "Jika akun tersedia, kode pemulihan sudah dikirim ke email tersebut." };
}

export async function resetPasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const verification = verificationSchema.safeParse({ email, otp });
  const password = signUpSchema.shape.password.safeParse(newPassword);
  if (!verification.success || !password.success) {
    return { verificationEmail: email, errors: { otp: verification.success ? [] : ["Masukkan kode 6 digit."], newPassword: password.success ? [] : password.error.issues.map((issue) => issue.message) }, message: "Periksa kode dan kata sandi baru." };
  }
  const client = await createInsForgeServerClient();
  const tokenResult = await client.auth.exchangeResetPasswordToken({ email, code: otp });
  if (tokenResult.error || !tokenResult.data?.token) return { verificationEmail: email, message: "Kode pemulihan tidak valid atau sudah kedaluwarsa." };
  const resetResult = await client.auth.resetPassword({ newPassword, otp: tokenResult.data.token });
  if (resetResult.error) return { verificationEmail: email, message: getBackendErrorMessage(resetResult.error, "Kata sandi belum dapat diperbarui.") };
  redirect("/login?reset=success");
}
