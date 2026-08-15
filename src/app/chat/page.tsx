import type { Metadata } from "next";
import { AppShell } from "@/components/navigation/app-shell";
import { ChatAssistant } from "@/features/chat/chat-assistant";
import { loadChatPageData } from "@/lib/sehatin/queries";

export const metadata: Metadata = { title: "Pendamping" };

export default async function ChatPage() {
  const chatData = await loadChatPageData();
  return (
    <AppShell activePath="/chat">
      <ChatAssistant initialData={chatData} />
    </AppShell>
  );
}

