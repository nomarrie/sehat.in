export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timeLabel: string;
  kind?: "message" | "adjustment";
  generatedByAi: boolean;
  adjustment?: WorkoutAdjustment;
};

export type WorkoutAdjustment = {
  title: string;
  description: string;
  changes: string[];
  status: "pending" | "applied" | "declined";
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

export type ChatPageData = {
  sessionId: string | null;
  context: ChatContextItem[];
  messages: ChatMessage[];
};

