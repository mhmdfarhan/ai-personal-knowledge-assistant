"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, FileText, Send, Sparkles, User } from "lucide-react";
import { Markdown } from "@/components/chat/markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/database";

export interface SourceInfo {
  document_id: string;
  document_title: string;
  similarity?: number;
}

type LocalMessage = {
  key: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceInfo[];
};

const EXAMPLE_PROMPTS = [
  "Apa saja yang ada di knowledge base saya?",
  "Jelaskan catatan yang pernah saya simpan tentang deployment.",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseSourcesHeader(value: string | null): SourceInfo[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function messageSources(m: Message): SourceInfo[] {
  const meta = (m.metadata ?? {}) as { sources?: unknown };
  return Array.isArray(meta.sources) ? (meta.sources as SourceInfo[]) : [];
}

export function ChatPanel({
  conversationId,
  initialMessages,
}: {
  conversationId: string | null;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<LocalMessage[]>(() =>
    initialMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        key: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        sources: messageSources(m),
      })),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingText, setPendingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingText, busy]);

  async function openSource(docId: string) {
    const res = await fetch(`/api/documents/${docId}/file`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
  }

  async function send(message?: string) {
    const question = (message ?? input).trim();
    if (!question || busy) return;

    const userMsg: LocalMessage = {
      key: `local-user-${Date.now()}`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    setPendingText("");

    let fullAnswer = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: question,
        }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Terjadi kesalahan saat memproses pertanyaan.");
      }

      const newConversationId = res.headers.get("x-conversation-id");
      const sources = parseSourcesHeader(res.headers.get("x-sources-json"));
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          fullAnswer += value;
          setPendingText(fullAnswer);
        }
      }

      if (!conversationId && newConversationId) {
        for (let i = 0; i < 15; i++) {
          const check = await fetch(`/api/conversations/${newConversationId}`, {
            cache: "no-store",
          });
          if (check.ok) {
            const data = await check.json();
            const msgs = (data.messages ?? []) as Message[];
            const last = msgs[msgs.length - 1];
            if (last && last.role === "assistant") break;
          }
          await sleep(200);
        }
        router.replace(`/chat/${newConversationId}`);
        return;
      }

      if (fullAnswer) {
        setMessages((prev) => [
          ...prev,
          {
            key: `local-assistant-${Date.now()}`,
            role: "assistant",
            content: fullAnswer,
            sources,
          },
        ]);
      }
      window.dispatchEvent(new Event("pka:conversations-changed"));
    } catch (err) {
      const text = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setMessages((prev) => [
        ...prev,
        { key: `local-error-${Date.now()}`, role: "assistant", content: text },
      ]);
    } finally {
      setBusy(false);
      setPendingText("");
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Area pesan */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4 pr-1">
        {empty && !busy ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20">
              <Sparkles className="h-7 w-7 text-indigo-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-100">
              Tanyakan apa saja tentang knowledge kamu
            </h2>
            <p className="mt-1 max-w-md text-sm text-zinc-500">
              Jawaban AI hanya bersumber dari knowledge, dokumen, dan catatan
              pribadi yang kamu simpan — beserta sumbernya.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <MessageBubble key={m.key} message={m} onOpenSource={openSource} />
        ))}

        {busy && (
          <MessageBubble
            message={{
              key: "pending",
              role: "assistant",
              content: "",
            }}
            typing={!pendingText}
            pendingContent={pendingText}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/80 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            disabled={busy}
            placeholder="Tanyakan sesuatu tentang knowledge kamu…"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={busy || !input.trim()}
            title="Kirim"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-zinc-600">
          AI dapat membuat kesalahan — jawaban didasarkan pada knowledge kamu.
        </p>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

function MessageBubble({
  message,
  typing,
  pendingContent,
  onOpenSource,
}: {
  message: LocalMessage;
  typing?: boolean;
  pendingContent?: string;
  onOpenSource?: (docId: string) => void;
}) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];

  return (
    <div className={cn("flex w-full gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-zinc-700" : "bg-indigo-600/90",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm border border-zinc-800 bg-zinc-900 text-zinc-200",
          )}
        >
          {typing ? (
            <TypingDots />
          ) : isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          ) : (
            <Markdown content={pendingContent ?? message.content} />
          )}
        </div>

        {!isUser && sources.length > 0 && onOpenSource && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
              Sumber
            </span>
            {sources.map((s, i) => (
              <button
                key={s.document_id + i}
                onClick={() => onOpenSource(s.document_id)}
                title={`Buka dokumen: ${s.document_title}`}
                className="inline-flex max-w-56 items-center gap-1.5 truncate rounded-lg border border-zinc-700/80 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
              >
                <FileText className="h-3 w-3 shrink-0 text-indigo-400" />
                <span className="truncate">
                  [{i + 1}] {s.document_title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
