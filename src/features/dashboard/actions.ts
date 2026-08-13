"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getBackendErrorMessage } from "@/lib/insforge/errors";

const inputSchema = z.object({ date: z.string().date(), weight: z.number().min(30).max(300) });

export async function recordWeightAction(input: { date: string; weight: number }) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Catatan berat belum valid." };
  const client = await createInsForgeServerClient();
  const result = await client.functions.invoke("sehatin-program", {
    body: { action: "record-weight", weightKg: parsed.data.weight, loggedOn: parsed.data.date },
  });
  if (result.error) return { ok: false as const, message: getBackendErrorMessage(result.error, "Catatan belum dapat disimpan.") };
  revalidatePath("/dashboard");
  revalidatePath("/food");
  return { ok: true as const, message: "Catatan tersimpan dan rencanamu sudah disesuaikan." };
}
