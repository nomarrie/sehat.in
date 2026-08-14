import type { ChatMessage, ChatThread, QuickPrompt } from "@/features/chat/chat.types";

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

export const chatThreads: ChatThread[] = [
  {
    id: "weekly-progress",
    title: "Progres minggu ini",
    preview: "Target mingguan dan ritme yang bisa dijaga",
    timeLabel: "Hari ini",
    messages: initialChatMessages,
  },
  {
    id: "workout-adjustment",
    title: "Latihan terasa berat",
    preview: "Usulan penyesuaian latihan hari ini",
    timeLabel: "Kemarin",
    messages: [
      {
        id: "assistant-workout-history",
        role: "assistant",
        content:
          "Kita bisa membuat latihan hari ini lebih ringan. Aku menyiapkan usulan di bawah; paket aktifmu tetap sama sampai kamu mengonfirmasi.",
        timeLabel: "Kemarin",
        kind: "adjustment",
      },
    ],
  },
  {
    id: "post-workout-meal",
    title: "Makan setelah latihan",
    preview: "Pilihan sederhana untuk memulihkan tenaga",
    timeLabel: "Senin",
    messages: [
      {
        id: "assistant-meal-history",
        role: "assistant",
        content:
          "Setelah latihan, pilih makan yang terasa cukup dan mudah dibuat. Oat pisang dengan yogurt atau nasi hangat dengan ayam serta sayur bisa menjadi pilihan.",
        timeLabel: "Senin",
        kind: "message",
      },
    ],
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
