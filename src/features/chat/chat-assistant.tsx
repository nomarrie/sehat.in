"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr/ChatCircleDots";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr/ChatsCircle";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  chatThreads,
  initialChatMessages,
  quickPrompts,
  suggestedWorkoutAdjustment,
} from "@/data/chat-data";
import type { ChatMessage } from "./chat.types";


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
  const [activeThreadId, setActiveThreadId] = useState(chatThreads[0]?.id ?? "");
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

  function startNewConversation() {
    setMessages([]);
    setDraft("");
    setAdjustmentStatus("idle");
    setActiveThreadId("");
  }

  function selectThread(threadId: string) {
    const thread = chatThreads.find((item) => item.id === threadId);
    if (!thread) return;

    setMessages(thread.messages);
    setDraft("");
    setAdjustmentStatus("idle");
    setActiveThreadId(thread.id);
  }

  return (
    <div className="chat-page">
      <a className="skip-link" href="#chat-conversation">
        Lewati ke percakapan
      </a>

      <header className="chat-topbar">
        <div className="chat-topbar-navigation">
          <Link className="chat-back-link" href="/dashboard" aria-label="Kembali ke dashboard">
            <ArrowLeftIcon size={20} weight="bold" aria-hidden="true" />
          </Link>
          <Link className="chat-brand" href="/dashboard" aria-label="Sehat.in, dashboard">
            <span className="brand-mark" aria-hidden="true">
              <HeartbeatIcon size={20} weight="bold" />
            </span>
            <span>Sehat.in</span>
          </Link>
        </div>

        <div className="chat-topbar-assistant">
          <span className="chat-assistant-avatar" aria-hidden="true">
            <ChatCircleDotsIcon size={22} weight="fill" />
          </span>
          <div>
            <h1>Pendamping Sehat.in</h1>
            <p><span aria-hidden="true" /> Siap menemani</p>
          </div>
        </div>

        <span className="chat-demo-badge">Mode demo</span>
      </header>

      <main id="chat-conversation" className="chat-workspace" tabIndex={-1}>
        <aside className="chat-sidebar" aria-label="Riwayat percakapan">
          <button className="chat-new-thread" type="button" onClick={startNewConversation}>
            <PlusIcon size={18} weight="bold" aria-hidden="true" />
            <span>Percakapan baru</span>
          </button>

          <nav className="chat-thread-navigation" aria-labelledby="chat-thread-title">
            <h2 id="chat-thread-title">Percakapan</h2>
            <ul className="chat-thread-list" role="list">
              {chatThreads.map((thread) => {
                const isActive = activeThreadId === thread.id;

                return (
                  <li key={thread.id}>
                    <button
                      className={isActive ? "is-active" : undefined}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => selectThread(thread.id)}
                    >
                      <ChatsCircleIcon size={18} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                      <span>
                        <strong>{thread.title}</strong>
                        <small>{thread.preview}</small>
                      </span>
                      <time>{thread.timeLabel}</time>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="chat-safety-note">
            <ShieldCheckIcon size={20} weight="fill" aria-hidden="true" />
            <p>
              <strong>Ruang aman untuk bertanya</strong>
              <span>Pendamping ini tidak memberi diagnosis dan bukan pengganti tenaga profesional.</span>
            </p>
          </div>
        </aside>

        <section className="chat-panel" aria-label="Percakapan dengan pendamping Sehat.in">
          <ol className="chat-feed" aria-label="Percakapan" aria-live="polite">
            {messages.length === 0 ? (
              <li className="chat-empty-state">
                <span className="chat-message-avatar" aria-hidden="true">
                  <SparkleIcon size={16} weight="fill" />
                </span>
                <div>
                  <h2>Mulai percakapan baru</h2>
                  <p>Tulis pertanyaan tentang progres, makanan, atau latihanmu di bawah.</p>
                </div>
              </li>
            ) : null}
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
      </main>
    </div>
  );
}
