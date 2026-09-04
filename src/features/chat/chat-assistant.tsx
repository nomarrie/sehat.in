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
  resolveChatAdjustmentAction,
  sendChatMessageAction,
} from "./actions";
import { createChatThread } from "./chat-history";
import type { ChatMessage, ChatPageData, ChatThread } from "./chat.types";

const assistantMarkdownComponents: Components = {
  h1: "h3",
  h2: "h3",
  pre: ({ node, ...props }) => {
    void node;
    return <pre tabIndex={0} {...props} />;
  },
};

function updateAdjustmentStatus(
  messages: ChatMessage[],
  messageId: string,
  status: "applied" | "declined",
) {
  return messages.map((message) =>
    message.id === messageId && message.adjustment
      ? {
          ...message,
          adjustment: { ...message.adjustment, status },
        }
      : message,
  );
}

export function ChatAssistant({ initialData }: { initialData: ChatPageData }) {
  const [messages, setMessages] = useState(initialData.messages);
  const [sessionId, setSessionId] = useState(initialData.sessionId);
  const [threads, setThreads] = useState(initialData.threads);
  const [draft, setDraft] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState(initialData.sessionId ?? "");
  const [isPending, startTransition] = useTransition();
  const feedRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
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
    const currentMessages = messages;
    const currentSessionId = sessionId;

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setRequestError(null);

    startTransition(async () => {
      const result = await sendChatMessageAction({
        sessionId: currentSessionId,
        clientMessageId,
        content: cleanMessage,
      });

      if (!result.ok) {
        setRequestError(result.message);
        return;
      }

      const updatedMessages = [...currentMessages, userMessage, result.assistantMessage];
      const updatedThread = createChatThread({
        id: result.sessionId,
        messages: updatedMessages,
        timeLabel: "Hari ini",
      });

      setSessionId(result.sessionId);
      setActiveThreadId(result.sessionId);
      setMessages(updatedMessages);
      setThreads((current) => [
        updatedThread,
        ...current.filter((thread) => thread.id !== result.sessionId),
      ].slice(0, 10));
    });
  }

  function resolveAdjustment(messageId: string, decision: "apply" | "decline") {
    if (isPending) return;
    setRequestError(null);

    startTransition(async () => {
      const result = await resolveChatAdjustmentAction({ messageId, decision });
      if (!result.ok) {
        setRequestError(result.message);
        return;
      }

      setMessages((current) => updateAdjustmentStatus(current, messageId, result.status));
      setThreads((current) => current.map((thread) => thread.id === sessionId
        ? {
            ...thread,
            messages: updateAdjustmentStatus(thread.messages, messageId, result.status),
          }
        : thread));
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

  function selectThread(thread: ChatThread) {
    setMessages(thread.messages);
    setSessionId(thread.id);
    setDraft("");
    setRequestError(null);
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
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    className={activeThreadId === thread.id ? "is-active" : undefined}
                    type="button"
                    aria-pressed={activeThreadId === thread.id}
                    disabled={isPending}
                    onClick={() => selectThread(thread)}
                  >
                    <ChatsCircleIcon
                      size={18}
                      weight={activeThreadId === thread.id ? "fill" : "regular"}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{thread.title}</strong>
                      <small>{thread.preview}</small>
                    </span>
                    <time>{thread.timeLabel}</time>
                  </button>
                </li>
              ))}
              {threads.length === 0 ? (
                <li className="chat-thread-empty">Belum ada percakapan tersimpan.</li>
              ) : null}
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
          <div className="chat-mobile-history">
            <label htmlFor="chat-mobile-thread">Riwayat percakapan</label>
            <select
              id="chat-mobile-thread"
              value={activeThreadId}
              disabled={isPending}
              onChange={(event) => {
                const thread = threads.find((item) => item.id === event.target.value);
                if (thread) selectThread(thread);
                else startNewConversation();
              }}
            >
              <option value="">Percakapan baru</option>
              {threads.map((thread) => (
                <option value={thread.id} key={thread.id}>{thread.title}</option>
              ))}
            </select>
          </div>
          <ol
            ref={feedRef}
            className="chat-feed"
            aria-label="Percakapan"
            aria-live="polite"
          >
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
                      <div className="chat-adjustment-table-wrap">
                        <table className="chat-adjustment-table">
                          <caption className="visually-hidden">
                            Perbandingan penyesuaian {message.adjustment.target === "food" ? "makanan" : "latihan"}
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">Bagian</th>
                              <th scope="col">Saat ini</th>
                              <th scope="col">Usulan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {message.adjustment.rows.map((row, index) => (
                              <tr key={`${row.label}-${index}`}>
                                <th scope="row">{row.label}</th>
                                <td>{row.before}</td>
                                <td>{row.after}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {message.adjustment.status === "pending" ? (
                        <p className="chat-adjustment-note">
                          {message.adjustment.target === "food"
                            ? "Usulan ini belum mengubah rekomendasi makananmu."
                            : "Usulan ini belum mengubah paket latihanmu."}
                        </p>
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
                          {message.adjustment.target === "food" ? "Pertahankan menu" : "Pertahankan latihan"}
                        </button>
                      </div>
                      {message.adjustment.status !== "pending" ? (
                        <p className="chat-adjustment-status" role="status">
                          {message.adjustment.status === "applied"
                            ? message.adjustment.target === "food"
                              ? "Rekomendasi makanan sudah disesuaikan."
                              : "Paket latihan sudah disesuaikan."
                            : message.adjustment.target === "food"
                              ? "Rekomendasi makanan tetap seperti semula."
                              : "Paket latihan tetap seperti semula."}
                        </p>
                      ) : null}
                    </section>
                  ) : null}
                  <small>{message.role === "assistant" ? "Pendamping" : "Kamu"} · {message.timeLabel}</small>
                </div>
              </li>
            ))}
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
