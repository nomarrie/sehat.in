"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOnboardedUser } from "@/lib/auth/guards";
import type { ChatAdjustment, ChatMessage } from "./chat.types";

const sendMessageSchema = z.object({
  sessionId: z.string().uuid().nullable(),
  clientMessageId: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
});

const resolveAdjustmentSchema = z.object({
  messageId: z.string().uuid(),
  decision: z.enum(["apply", "decline"]),
});

type EdgeAssistantMessage = {
  id: string;
  content: string;
  kind: "message" | "adjustment";
  generatedByAi: boolean;
  adjustment: ChatAdjustment | null;
  createdAt: string;
};

type ChatEdgeResponse = {
  sessionId: string;
  assistantMessage: EdgeAssistantMessage;
};

type ResolveEdgeResponse = {
  status: "applied" | "declined";
  target: "workout" | "food";
  packageId?: string;
  recommendationSetId?: string;
};

export type SendChatMessageResult =
  | { ok: true; sessionId: string; assistantMessage: ChatMessage }
  | { ok: false; message: string };

export type ResolveChatAdjustmentResult =
  | {
      ok: true;
      status: "applied" | "declined";
      message: string;
      target: "workout" | "food";
      packageId?: string;
      recommendationSetId?: string;
    }
  | { ok: false; message: string };

export async function sendChatMessageAction(
  input: z.input<typeof sendMessageSchema>,
): Promise<SendChatMessageResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues.some((issue) => issue.path[0] === "content")
        ? "Tulis pesan sebelum mengirim."
        : "Pesan belum valid.",
    };
  }

  const { client } = await requireOnboardedUser();
  const result = await client.functions.invoke<ChatEdgeResponse>("sehatin-program", {
    body: { action: "chat-message", ...parsed.data },
  });

  if (result.error || !result.data?.assistantMessage) {
    return {
      ok: false,
      message: "Pendamping belum dapat merespons. Coba lagi sebentar.",
    };
  }

  const assistant = result.data.assistantMessage;
  return {
    ok: true,
    sessionId: result.data.sessionId,
    assistantMessage: {
      id: assistant.id,
      role: "assistant",
      content: assistant.content,
      timeLabel: "Sekarang",
      kind: assistant.kind,
      generatedByAi: assistant.generatedByAi,
      adjustment: assistant.adjustment ?? undefined,
    },
  };
}

export async function resolveChatAdjustmentAction(
  input: z.input<typeof resolveAdjustmentSchema>,
): Promise<ResolveChatAdjustmentResult> {
  const parsed = resolveAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Usulan penyesuaian belum valid." };
  }

  const { client } = await requireOnboardedUser();
  const result = await client.functions.invoke<ResolveEdgeResponse>("sehatin-program", {
    body: { action: "resolve-chat-adjustment", ...parsed.data },
  });
  if (result.error || !result.data) {
    return {
      ok: false,
      message: "Pilihanmu belum dapat disimpan. Coba lagi sebentar.",
    };
  }

  revalidatePath("/chat");
  if (result.data.status === "applied") {
    revalidatePath("/dashboard");
    if (result.data.target === "food") {
      revalidatePath("/food");
    } else if (result.data.packageId) {
      revalidatePath(`/packages/${result.data.packageId}`);
    }
  }

  return {
    ok: true,
    status: result.data.status,
    target: result.data.target,
    message: result.data.status === "applied"
      ? result.data.target === "food"
        ? "Rekomendasi makanan sudah disesuaikan."
        : "Paket latihan sudah disesuaikan."
      : result.data.target === "food"
        ? "Rekomendasi makanan tetap seperti semula."
        : "Paket latihan tetap seperti semula.",
    packageId: result.data.packageId,
    recommendationSetId: result.data.recommendationSetId,
  };
}
