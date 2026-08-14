import type { Metadata } from "next";
import { ChatAssistant } from "@/features/chat/chat-assistant";
import { requireOnboardedUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Pendamping" };

export default async function ChatPage() {
  await requireOnboardedUser();

  return <ChatAssistant />;
}

