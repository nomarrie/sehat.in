import type { Metadata } from "next";
import { AppShell } from "@/components/navigation/app-shell";
import { ChatAssistant } from "@/features/chat/chat-assistant";

export const metadata: Metadata = { title: "Pendamping" };

export default function ChatPage() {
  return (
    <AppShell activePath="/chat">
      <ChatAssistant />
    </AppShell>
  );
}

