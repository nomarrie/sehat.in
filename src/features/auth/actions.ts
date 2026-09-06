"use server";

import { createAuthActions } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getInsForgeConfig } from "@/lib/insforge/config";
import { getBackendErrorMessage } from "@/lib/insforge/errors";
import {
  getAuthCookieOptions,
  getOAuthRememberMeCookieOptions,
  getRememberMeCookieOptions,
  OAUTH_REMEMBER_ME_COOKIE,
  REMEMBER_ME_COOKIE,
} from "@/lib/insforge/auth-session";
import {
  onboardingSchema,
  signInSchema,
  signUpSchema,
  verificationSchema,
  type AuthFormState,
} from "./auth-validation";

const PASSWORD_RESET_TOKEN_COOKIE = "sehatin_password_reset_token";

function getPasswordResetCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/reset-password",
    maxAge: 600,
  };
}

function clearPasswordResetCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(PASSWORD_RESET_TOKEN_COOKIE, "", {
    ...getPasswordResetCookieOptions(),
    maxAge: 0,
  });
}

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

export async function initiateOAuth(provider: string, rememberMe: boolean) {
  if (!new Set(["google", "facebook"]).has(provider)) redirect("/login?error=provider");
  const cookieStore = await cookies();
  const auth = createAuthActions({ ...getInsForgeConfig(), cookies: cookieStore });
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/callback`;
  const { data, error } = await auth.signInWithOAuth(provider, { redirectTo: callbackUrl, skipBrowserRedirect: true });
  if (error || !data.url || !data.codeVerifier) redirect("/login?error=oauth");
  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
  });
  cookieStore.set(
    OAUTH_REMEMBER_ME_COOKIE,
    rememberMe === true ? "1" : "0",
    getOAuthRememberMeCookieOptions(),
  );
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
    goalDirection: formData.get("goalDirection"), weeklyTargetKg: formData.get("weeklyTargetKg"), activityLevel: formData.get("activityLevel"), mealPreference: formData.get("mealPreference"),
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
    goalDirection: parsed.data.goalDirection,
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
  if (!emailResult.success) return { passwordResetStep: "request", errors: { email: [emailResult.error.issues[0]?.message ?? "Email tidak valid."] } };
  clearPasswordResetCookie(await cookies());
  const client = await createInsForgeServerClient();
  const { error } = await client.auth.sendResetPasswordEmail({ email: emailResult.data, redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password` });
  return error
    ? { passwordResetStep: "request", message: getBackendErrorMessage(error, "Kode pemulihan belum dapat dikirim.") }
    : { passwordResetStep: "verify", verificationEmail: emailResult.data, message: "Jika akun tersedia, kode pemulihan sudah dikirim ke email tersebut." };
}

export async function verifyPasswordResetCodeAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();
  const verification = verificationSchema.safeParse({ email, otp });
  if (!verification.success) {
    return {
      passwordResetStep: "verify",
      verificationEmail: email,
      errors: { otp: ["Masukkan kode 6 digit."] },
      message: "Periksa kembali kode pemulihan.",
    };
  }
  const client = await createInsForgeServerClient();
  const tokenResult = await client.auth.exchangeResetPasswordToken({ email, code: otp });
  if (tokenResult.error || !tokenResult.data?.token) {
    return {
      passwordResetStep: "verify",
      verificationEmail: email,
      message: "Kode pemulihan tidak valid atau sudah kedaluwarsa.",
    };
  }
  (await cookies()).set(
    PASSWORD_RESET_TOKEN_COOKIE,
    tokenResult.data.token,
    getPasswordResetCookieOptions(),
  );
  return {
    passwordResetStep: "password",
    verificationEmail: email,
    message: "Kode berhasil diverifikasi. Sekarang buat kata sandi baru.",
  };
}

export async function resetPasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "");
  const cookieStore = await cookies();
  const resetToken = cookieStore.get(PASSWORD_RESET_TOKEN_COOKIE)?.value;
  if (!resetToken) {
    return {
      passwordResetStep: "request",
      message: "Verifikasi kode pemulihan terlebih dahulu.",
    };
  }
  const password = signUpSchema.shape.password.safeParse(newPassword);
  const passwordsMatch = newPassword === confirmNewPassword;
  if (!password.success || !passwordsMatch) {
    return {
      passwordResetStep: "password",
      verificationEmail: email,
      errors: {
        newPassword: password.success ? [] : password.error.issues.map((issue) => issue.message),
        confirmNewPassword: passwordsMatch ? [] : ["Konfirmasi kata sandi tidak sama."],
      },
      message: "Periksa kembali kata sandi baru.",
    };
  }
  const client = await createInsForgeServerClient();
  const resetResult = await client.auth.resetPassword({ newPassword, otp: resetToken });
  if (resetResult.error) {
    clearPasswordResetCookie(cookieStore);
    return {
      passwordResetStep: "request",
      message: getBackendErrorMessage(resetResult.error, "Verifikasi sudah kedaluwarsa. Minta kode pemulihan baru."),
    };
  }
  clearPasswordResetCookie(cookieStore);
  redirect("/login?reset=success");
}
