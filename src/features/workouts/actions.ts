"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getBackendErrorMessage } from "@/lib/insforge/errors";

const completionSchema = z.object({
  packageId: z.string().uuid(), clientCompletionId: z.string().uuid(), activeDurationSeconds: z.number().int().min(0).max(86400),
  startedAt: z.string().datetime().nullable(), completedAt: z.string().datetime(),
  results: z.array(z.object({ subExerciseId: z.string().uuid(), completedSets: z.number().int().min(0).max(10), completedRepetitions: z.number().int().min(0).max(1000).nullable(), activeDurationSeconds: z.number().int().min(0).max(14400), completed: z.boolean() })).max(50),
});

export async function completeWorkoutAction(input: z.infer<typeof completionSchema>) {
  const parsed = completionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Ringkasan sesi belum valid." };
  const client = await createInsForgeServerClient();
  const result = await client.functions.invoke<{ result?: { newBadges?: Array<{ name: string }> } }>("sehatin-program", { body: { action: "complete-workout", ...parsed.data } });
  if (result.error) return { ok: false as const, message: getBackendErrorMessage(result.error, "Sesi belum dapat disimpan.") };
  revalidatePath("/dashboard"); revalidatePath("/food");
  return { ok: true as const, message: "Sesi tersimpan.", newBadges: result.data?.result?.newBadges ?? [] };
}
