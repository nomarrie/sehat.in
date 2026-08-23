export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timeLabel: string;
  kind?: "message" | "adjustment";
  generatedByAi: boolean;
  adjustment?: ChatAdjustment;
};

export type ChatAdjustmentRow = {
  label: string;
  before: string;
  after: string;
};

export type ChatAdjustment = {
  target: "workout" | "food";
  title: string;
  description: string;
  rows: ChatAdjustmentRow[];
  status: "pending" | "applied" | "declined";
};

export type ChatThread = {
  id: string;
  title: string;
  preview: string;
  timeLabel: string;
  messages: ChatMessage[];
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

