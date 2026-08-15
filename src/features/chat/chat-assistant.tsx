"use client";

import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr/ChatCircleDots";
import { FireSimpleIcon } from "@phosphor-icons/react/dist/ssr/FireSimple";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { ScalesIcon } from "@phosphor-icons/react/dist/ssr/Scales";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { quickPrompts } from "@/data/chat-data";
import {
  resolveWorkoutAdjustmentAction,
  sendChatMessageAction,
} from "./actions";
import type { ChatMessage, ChatPageData } from "./chat.types";

const contextIcons = {
  weight: ScalesIcon,
  streak: FireSimpleIcon,
  workout: BarbellIcon,
};

export function ChatAssistant({ initialData }: { initialData: ChatPageData }) {
  const [messages, setMessages] = useState(initialData.messages);
  const [sessionId, setSessionId] = useState(initialData.sessionId);
  const [draft, setDraft] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollAnchor = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (typeof scrollAnchor.current?.scrollIntoView === "function") {
      scrollAnchor.current.scrollIntoView({ block: "end" });
    }
  }, [messages, requestError]);

  function sendMessage(content: string) {
    const cleanMessage = content.trim();
    if (!cleanMessage || isPending) return;

    const clientMessageId = crypto.randomUUID();
    const userMessage: ChatMessage = {
      id: `user-${clientMessageId}`,
      role: "user",
      content: cleanMessage,
      timeLabel: "Sekarang",
      kind: "message",
      generatedByAi: false,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setRequestError(null);

    startTransition(async () => {
      const result = await sendChatMessageAction({
        sessionId,
        clientMessageId,
        content: cleanMessage,
      });

      if (!result.ok) {
        setRequestError(result.message);
        return;
      }

      setSessionId(result.sessionId);
      setMessages((current) => [...current, result.assistantMessage]);
    });
  }

  function resolveAdjustment(messageId: string, decision: "apply" | "decline") {
    if (isPending) return;
    setRequestError(null);

    startTransition(async () => {
      const result = await resolveWorkoutAdjustmentAction({ messageId, decision });
      if (!result.ok) {
        setRequestError(result.message);
        return;
      }

      setMessages((current) => current.map((message) =>
        message.id === messageId && message.adjustment
          ? {
              ...message,
              adjustment: { ...message.adjustment, status: result.status },
            }
          : message,
      ));
    });
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
              <h2 id="chat-context-title">Ringkasan programmu</h2>
            </div>
          </div>

          <ul className="chat-context-list" role="list">
            {initialData.context.map((item) => {
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

        <section
          className="chat-panel"
          aria-label="Percakapan dengan pendamping Sehat.in"
          aria-busy={isPending}
        >
          <header className="chat-panel-header">
            <span className="chat-assistant-avatar" aria-hidden="true">
              <ChatCircleDotsIcon size={23} weight="fill" />
            </span>
            <div>
              <h2>Pendamping Sehat.in</h2>
              <p><span aria-hidden="true" /> Siap menemani</p>
            </div>
            <span className="chat-demo-badge">Percakapan privat</span>
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
                  {message.kind === "adjustment" && message.adjustment ? (
                    <section className="chat-adjustment-card" aria-labelledby={`${message.id}-title`}>
                      <div>
                        <p className="module-kicker">Perlu persetujuanmu</p>
                        <h3 id={`${message.id}-title`}>{message.adjustment.title}</h3>
                        <p>{message.adjustment.description}</p>
                      </div>
                      <ul>
                        {message.adjustment.changes.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                      {message.adjustment.status === "pending" ? (
                        <p className="chat-adjustment-note">Usulan ini belum mengubah paket latihanmu.</p>
                      ) : null}
                      <div className="chat-adjustment-actions">
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={message.adjustment.status !== "pending" || isPending}
                          onClick={() => resolveAdjustment(message.id, "apply")}
                        >
                          {message.adjustment.status === "applied"
                            ? "Sudah diterapkan"
                            : "Terapkan penyesuaian"}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={message.adjustment.status !== "pending" || isPending}
                          onClick={() => resolveAdjustment(message.id, "decline")}
                        >
                          Pertahankan latihan
                        </button>
                      </div>
                      {message.adjustment.status !== "pending" ? (
                        <p className="chat-adjustment-status" role="status">
                          {message.adjustment.status === "applied"
                            ? "Paket latihan sudah disesuaikan."
                            : "Paket latihan tetap seperti semula."}
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
                <button
                  key={prompt.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => sendMessage(prompt.label)}
                >
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
                disabled={isPending}
                placeholder="Tulis pertanyaanmu di sini…"
              />
              <button type="submit" aria-label="Kirim pesan" disabled={isPending || !draft.trim()}>
                <PaperPlaneTiltIcon size={21} weight="fill" aria-hidden="true" />
              </button>
            </form>
            {requestError ? <p className="chat-request-error" role="alert">{requestError}</p> : null}
            <p className="chat-composer-hint">Enter untuk kirim · Shift + Enter untuk baris baru</p>
          </div>
        </section>
      </div>
    </div>
  );
}
