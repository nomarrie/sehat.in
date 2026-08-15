"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr/ChatCircleDots";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr/ChatsCircle";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { quickPrompts } from "@/data/chat-data";
import {
  resolveWorkoutAdjustmentAction,
  sendChatMessageAction,
} from "./actions";
import type { ChatMessage, ChatPageData } from "./chat.types";

const assistantMarkdownComponents: Components = {
  h1: "h3",
  h2: "h3",
  pre: ({ node, ...props }) => {
    void node;
    return <pre tabIndex={0} {...props} />;
  },
};

export function ChatAssistant({ initialData }: { initialData: ChatPageData }) {
  const [messages, setMessages] = useState(initialData.messages);
  const [sessionId, setSessionId] = useState(initialData.sessionId);
  const [draft, setDraft] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState("current");
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

    setActiveThreadId("current");
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

  function startNewConversation() {
    setMessages([]);
    setSessionId(null);
    setDraft("");
    setRequestError(null);
    setActiveThreadId("");
  }

  function restoreLatestConversation() {
    setMessages(initialData.messages);
    setSessionId(initialData.sessionId);
    setDraft("");
    setRequestError(null);
    setActiveThreadId("current");
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

        <span className="chat-demo-badge">Percakapan privat</span>
      </header>

      <main id="chat-conversation" className="chat-workspace" tabIndex={-1}>
        <aside className="chat-sidebar" aria-label="Riwayat percakapan">
          <button
            className="chat-new-thread"
            type="button"
            disabled={isPending}
            onClick={startNewConversation}
          >
            <PlusIcon size={18} weight="bold" aria-hidden="true" />
            <span>Percakapan baru</span>
          </button>

          <nav className="chat-thread-navigation" aria-labelledby="chat-thread-title">
            <h2 id="chat-thread-title">Percakapan</h2>
            <ul className="chat-thread-list" role="list">
              <li>
                <button
                  className={activeThreadId === "current" ? "is-active" : undefined}
                  type="button"
                  aria-pressed={activeThreadId === "current"}
                  onClick={restoreLatestConversation}
                >
                  <ChatsCircleIcon
                    size={18}
                    weight={activeThreadId === "current" ? "fill" : "regular"}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>Progres minggu ini</strong>
                    <small>Latihan, makanan, dan progres terbarumu</small>
                  </span>
                  <time>Hari ini</time>
                </button>
              </li>
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

        <section
          className="chat-panel"
          aria-label="Percakapan dengan pendamping Sehat.in"
          aria-busy={isPending}
        >
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
                  {message.role === "assistant" ? (
                    <div className="chat-message-markdown">
                      <ReactMarkdown components={assistantMarkdownComponents} skipHtml>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
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
      </main>
    </div>
  );
}
