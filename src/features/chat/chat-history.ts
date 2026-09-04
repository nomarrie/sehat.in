import type { ChatMessage, ChatThread } from "./chat.types";

const THREAD_TITLE_LENGTH = 44;
const THREAD_PREVIEW_LENGTH = 72;

function summarize(content: string, maximumLength: number) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximumLength) return normalized;
  return `${normalized.slice(0, maximumLength - 1).trimEnd()}…`;
}

export function getChatThreadTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const source = firstUserMessage?.content ?? messages[0]?.content ?? "Percakapan baru";
  return summarize(source, THREAD_TITLE_LENGTH) || "Percakapan baru";
}

export function getChatThreadPreview(messages: ChatMessage[]) {
  const latestMessage = messages[messages.length - 1];
  if (!latestMessage) return "Belum ada pesan";
  return summarize(latestMessage.content, THREAD_PREVIEW_LENGTH) || "Belum ada pesan";
}

function getCalendarDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
  ) / 86_400_000;
}

export function formatChatThreadTimeLabel(
  updatedAt: string,
  timeZone: string,
  now = new Date(),
) {
  const updatedDate = new Date(updatedAt);
  const dayDifference = getCalendarDay(now, timeZone) - getCalendarDay(updatedDate, timeZone);

  if (dayDifference === 0) return "Hari ini";
  if (dayDifference === 1) return "Kemarin";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(updatedDate);
}

export function createChatThread({
  id,
  messages,
  timeLabel,
}: {
  id: string;
  messages: ChatMessage[];
  timeLabel: string;
}): ChatThread {
  return {
    id,
    title: getChatThreadTitle(messages),
    preview: getChatThreadPreview(messages),
    timeLabel,
    messages,
  };
}
