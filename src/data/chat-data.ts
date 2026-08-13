import type { ChatContextItem, ChatMessage, QuickPrompt } from "@/features/chat/chat.types";

export const chatContext: ChatContextItem[] = [
  {
    id: "weight",
    label: "Berat saat ini",
    value: "88,7 kg",
    detail: "Turun 0,5 kg minggu ini",
  },
  {
    id: "streak",
    label: "Streak aktif",
    value: "6 hari",
    detail: "22 dari 30 menit hari ini",
  },
  {
    id: "workout",
    label: "Paket aktif",
    value: "Latihan Hari Ini",
    detail: "Pemula · sekitar 28 menit",
  },
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "Halo, Naila. Aku sudah melihat progres terbarumu. Streak enam harimu masih aktif dan target minggu ini sudah dekat. Mau membahas latihan, makanan, atau progresmu?",
    timeLabel: "Sekarang",
    kind: "message",
  },
];

export const quickPrompts: QuickPrompt[] = [
  { id: "workout-adjustment", label: "Latihan hari ini terasa terlalu berat" },
  { id: "weekly-progress", label: "Bagaimana progresku minggu ini?" },
  { id: "meal-idea", label: "Ide makan setelah latihan" },
];

export const suggestedWorkoutAdjustment = {
  title: "Usulan penyesuaian",
  description: "Turunkan beban hari ini tanpa menghilangkan ritme latihanmu.",
  changes: [
    "Chair Squat: 3 × 10 menjadi 2 × 8",
    "Wall Push-Up: waktu istirahat 45 menjadi 60 detik",
  ],
};

