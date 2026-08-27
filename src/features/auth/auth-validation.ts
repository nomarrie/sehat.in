import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Masukkan alamat email yang valid."),
  password: z.string().min(1, "Masukkan kata sandi."),
  rememberMe: z.enum(["on"]).nullish().transform((value) => value === "on"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100, "Nama terlalu panjang."),
  email: z.string().trim().email("Masukkan alamat email yang valid."),
  password: z.string()
    .min(8, "Kata sandi minimal 8 karakter.")
    .regex(/[a-z]/, "Gunakan setidaknya satu huruf kecil.")
    .regex(/[0-9]/, "Gunakan setidaknya satu angka."),
});

export const verificationSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "Masukkan kode verifikasi 6 digit."),
});

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  age: z.coerce.number().int().min(13, "Usia minimal 13 tahun.").max(100, "Periksa kembali usia kamu."),
  heightCm: z.coerce.number().min(100, "Tinggi minimal 100 cm.").max(250, "Tinggi maksimal 250 cm."),
  initialWeightKg: z.coerce.number().min(30, "Berat minimal 30 kg.").max(300, "Berat maksimal 300 kg."),
  targetWeightKg: z.coerce.number().min(30, "Target minimal 30 kg.").max(300, "Target maksimal 300 kg."),
  weeklyTargetKg: z.coerce.number().min(0.5, "Target mingguan minimal 0,5 kg.").max(1, "Target mingguan maksimal 1 kg."),
  activityLevel: z.enum(["pemula", "menengah", "aktif"]),
  mealPreference: z.enum(["seimbang", "tinggi-protein", "nabati"]),
  aiProcessingConsent: z.enum(["on"]).optional().transform((value) => value === "on"),
}).refine((value) => value.targetWeightKg < value.initialWeightKg, {
  path: ["targetWeightKg"],
  message: "Target berat harus lebih rendah dari berat awal.",
});

export type AuthFormState = {
  message?: string;
  errors?: Record<string, string[]>;
  verificationEmail?: string;
};
