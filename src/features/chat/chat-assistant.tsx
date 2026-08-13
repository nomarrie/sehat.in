"use client";

import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr/ChatCircleDots";
import { FireSimpleIcon } from "@phosphor-icons/react/dist/ssr/FireSimple";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { ScalesIcon } from "@phosphor-icons/react/dist/ssr/Scales";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  chatContext,
  initialChatMessages,
  quickPrompts,
  suggestedWorkoutAdjustment,
} from "@/data/chat-data";
import type { ChatMessage } from "./chat.types";

const contextIcons = {
  weight: ScalesIcon,
  streak: FireSimpleIcon,
  workout: BarbellIcon,
};

function getDummyReply(message: string): Pick<ChatMessage, "content" | "kind"> {
  const normalized = message.toLocaleLowerCase("id-ID");

  if (/sakit|nyeri|pusing|sesak/.test(normalized)) {
    return {
      content:
        "Hentikan gerakan yang memicu rasa sakit dan beri tubuhmu waktu untuk pulih. Aku tidak bisa menilai penyebabnya lewat chat; bila rasa sakit menetap, memburuk, atau mengganggu aktivitas, sebaiknya bicara dengan tenaga kesehatan.",
      kind: "message",
    };
  }

  if (/latihan/.test(normalized) && /berat|sulit|terlalu/.test(normalized)) {
    return {
      content:
        "Kita bisa membuat latihan hari ini lebih ringan. Aku menyiapkan usulan di bawah; paket aktifmu tetap sama sampai kamu mengonfirmasi.",
      kind: "adjustment",
    };
  }

  if (/target|progres|minggu/.test(normalized)) {
    return {
      content:
        "Target mingguanmu masih berada di rentang yang terarah. Beratmu turun 0,5 kg dari awal minggu dan hanya berjarak 0,1 kg dari target 88,6 kg. Tidak perlu mengejar angka itu dengan perubahan ekstrem—lanjutkan ritme makan dan aktivitas yang terasa sanggup dijaga.",
      kind: "message",
    };
  }

  if (/makan|lapar|kalori/.test(normalized)) {
    return {
      content:
        "Setelah latihan, pilih makan yang terasa cukup dan mudah dibuat. Oat pisang dengan yogurt bisa memberi karbohidrat dan protein, atau nasi hangat dengan ayam panggang serta sayur bila kamu ingin makanan utama.",
      kind: "message",
    };
  }

  return {
    content:
      "Aku sudah mencatat pertanyaanmu. Untuk sesi demo ini, coba ceritakan apakah hal tersebut lebih berkaitan dengan latihan, makanan, atau progres mingguan agar jawabanku lebih terarah.",
    kind: "message",
  };
}

export function ChatAssistant() {
  const [messages, setMessages] = useState(initialChatMessages);
  const [draft, setDraft] = useState("");
  const [adjustmentStatus, setAdjustmentStatus] = useState<"idle" | "applied" | "kept">(
    "idle",
  );
  const messageSequence = useRef(initialChatMessages.length);
  const scrollAnchor = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (typeof scrollAnchor.current?.scrollIntoView === "function") {
      scrollAnchor.current.scrollIntoView({ block: "end" });
    }
  }, [messages, adjustmentStatus]);

  function sendMessage(content: string) {
    const cleanMessage = content.trim();
    if (!cleanMessage) return;

    const sequence = messageSequence.current;
    messageSequence.current += 2;
    const reply = getDummyReply(cleanMessage);

    setMessages((current) => [
      ...current,
      {
        id: `user-${sequence}`,
        role: "user",
        content: cleanMessage,
        timeLabel: "Sekarang",
        kind: "message",
      },
      {
        id: `assistant-${sequence + 1}`,
        role: "assistant",
        content: reply.content,
        timeLabel: "Sekarang",
        kind: reply.kind,
      },
    ]);
    setDraft("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage(draft);
    }
  }

  function choosePrompt(prompt: string) {
    setAdjustmentStatus("idle");
    sendMessage(prompt);
  }

  return (
    <div className="chat-page">
      <header className="chat-page-heading">
        <div>
          <p className="date-label">Pendamping virtual</p>
          <h1>Teman ngobrol untuk langkah sehatmu</h1>
        </div>
        <p>Tanyakan progres, makanan, atau latihan tanpa perlu mengulang ceritamu.</p>
      </header>

      <div className="chat-workspace">
        <aside className="chat-context-panel" aria-labelledby="chat-context-title">
          <div className="chat-context-heading">
            <span className="module-icon" aria-hidden="true">
              <SparkleIcon size={21} weight="fill" />
            </span>
            <div>
              <p className="module-kicker">Konteks percakapan</p>
              <h2 id="chat-context-title">Ringkasan Naila</h2>
            </div>
          </div>

          <ul className="chat-context-list" role="list">
            {chatContext.map((item) => {
              const Icon = contextIcons[item.id];
              return (
                <li key={item.id}>
                  <span className="chat-context-icon" aria-hidden="true">
                    <Icon size={19} weight="bold" />
                  </span>
                  <span>
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="chat-safety-note">
            <ShieldCheckIcon size={20} weight="fill" aria-hidden="true" />
            <p>
              <strong>Ruang aman untuk bertanya</strong>
              <span>Pendamping ini tidak memberi diagnosis dan bukan pengganti tenaga profesional.</span>
            </p>
          </div>
        </aside>

        <section className="chat-panel" aria-label="Percakapan dengan pendamping Sehat.in">
          <header className="chat-panel-header">
            <span className="chat-assistant-avatar" aria-hidden="true">
              <ChatCircleDotsIcon size={23} weight="fill" />
            </span>
            <div>
              <h2>Pendamping Sehat.in</h2>
              <p><span aria-hidden="true" /> Siap menemani</p>
            </div>
            <span className="chat-demo-badge">Mode demo</span>
          </header>

          <ol className="chat-feed" aria-label="Percakapan" aria-live="polite">
            {messages.map((message) => (
              <li className={`chat-message chat-message-${message.role}`} key={message.id}>
                {message.role === "assistant" ? (
                  <span className="chat-message-avatar" aria-hidden="true">
                    <SparkleIcon size={16} weight="fill" />
                  </span>
                ) : null}
                <div className="chat-message-content">
                  <p>{message.content}</p>
                  {message.kind === "adjustment" ? (
                    <section className="chat-adjustment-card" aria-labelledby={`${message.id}-title`}>
                      <div>
                        <p className="module-kicker">Perlu persetujuanmu</p>
                        <h3 id={`${message.id}-title`}>{suggestedWorkoutAdjustment.title}</h3>
                        <p>{suggestedWorkoutAdjustment.description}</p>
                      </div>
                      <ul>
                        {suggestedWorkoutAdjustment.changes.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                      <p className="chat-adjustment-note">Usulan ini belum mengubah paket latihanmu.</p>
                      <div className="chat-adjustment-actions">
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={adjustmentStatus !== "idle"}
                          onClick={() => setAdjustmentStatus("applied")}
                        >
                          {adjustmentStatus === "applied" ? "Sudah diterapkan" : "Terapkan untuk demo"}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={adjustmentStatus !== "idle"}
                          onClick={() => setAdjustmentStatus("kept")}
                        >
                          Pertahankan latihan
                        </button>
                      </div>
                      {adjustmentStatus !== "idle" ? (
                        <p className="chat-adjustment-status" role="status">
                          {adjustmentStatus === "applied"
                            ? "Penyesuaian diterapkan untuk sesi demo ini."
                            : "Paket latihan tetap seperti semula untuk sesi demo ini."}
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  <small>{message.role === "assistant" ? "Pendamping" : "Kamu"} · {message.timeLabel}</small>
                </div>
              </li>
            ))}
            <li ref={scrollAnchor} className="chat-scroll-anchor" aria-hidden="true" />
          </ol>

          <div className="chat-input-area">
            <div className="chat-quick-prompts" aria-label="Saran pertanyaan">
              {quickPrompts.map((prompt) => (
                <button key={prompt.id} type="button" onClick={() => choosePrompt(prompt.label)}>
                  {prompt.label}
                </button>
              ))}
            </div>

            <form className="chat-composer" onSubmit={handleSubmit}>
              <label className="visually-hidden" htmlFor="chat-message">
                Tulis pesan untuk pendamping
              </label>
              <textarea
                id="chat-message"
                name="message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                maxLength={500}
                placeholder="Tulis pertanyaanmu di sini…"
              />
              <button type="submit" aria-label="Kirim pesan" disabled={!draft.trim()}>
                <PaperPlaneTiltIcon size={21} weight="fill" aria-hidden="true" />
              </button>
            </form>
            <p className="chat-composer-hint">Enter untuk kirim · Shift + Enter untuk baris baru</p>
          </div>
        </section>
      </div>
    </div>
  );
}
