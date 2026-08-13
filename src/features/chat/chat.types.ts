export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timeLabel: string;
  kind?: "message" | "adjustment";
};

export type ChatContextItem = {
  id: "weight" | "streak" | "workout";
  label: string;
  value: string;
  detail: string;
};

export type QuickPrompt = {
  id: string;
  label: string;
};

