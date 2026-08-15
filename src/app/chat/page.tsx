import type { Metadata } from "next";
import { ChatAssistant } from "@/features/chat/chat-assistant";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { loadChatPageData } from "@/lib/sehatin/queries";

export const metadata: Metadata = { title: "Pendamping" };

export default async function ChatPage() {
  await requireOnboardedUser();
  const chatData = await loadChatPageData();

  return <ChatAssistant initialData={chatData} />;
}
