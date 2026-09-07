"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/database";

function groupLabel(iso: string): "Hari Ini" | "Kemarin" | "Sebelumnya" {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Hari Ini";
  if (sameDay(d, yesterday)) return "Kemarin";
  return "Sebelumnya";
}

export function ConversationList({
  initialConversations,
}: {
  initialConversations: Conversation[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState(initialConversations);

  const activeId =
    pathname.startsWith("/chat/") ? pathname.slice("/chat/".length) : null;

  // Refetch saat panel chat menandakan ada perubahan (kirim pesan dll).
  useEffect(() => {
    const handler = async () => {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations ?? []);
        }
      } catch {
        // abaikan — list akan ter-refresh pada navigasi berikutnya
      }
    };
    window.addEventListener("pka:conversations-changed", handler);
    return () => window.removeEventListener("pka:conversations-changed", handler);
  }, []);

  async function newConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return;
    const data = await res.json();
    router.push(`/chat/${data.conversation.id}`);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Hapus percakapan ini?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (activeId === id) router.push("/chat");
      else window.dispatchEvent(new Event("pka:conversations-changed"));
    }
  }

  const groups: { label: string; items: Conversation[] }[] = [];
  const byLabel = new Map<string, Conversation[]>();
  for (const c of conversations) {
    const label = groupLabel(c.updated_at ?? c.created_at);
    const arr = byLabel.get(label) ?? [];
    arr.push(c);
    byLabel.set(label, arr);
  }
  for (const label of ["Hari Ini", "Kemarin", "Sebelumnya"]) {
    if (byLabel.has(label)) groups.push({ label, items: byLabel.get(label)! });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2 pt-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Percakapan
        </span>
        <button
          onClick={newConversation}
          title="Percakapan baru"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>

      {conversations.length === 0 ? (
        <p className="px-1 py-3 text-sm text-zinc-600">
          Belum ada percakapan. Mulai chat baru untuk bertanya.
        </p>
      ) : (
        <div className="min-w-0 space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-1 pb-1 text-[11px] font-medium text-zinc-600">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((c) => {
                  const active = c.id === activeId;
                  return (
                    <div key={c.id} className="group relative">
                      <Link
                        href={`/chat/${c.id}`}
                        className={cn(
                          "block w-full truncate rounded-lg py-1.5 pl-2 pr-7 text-sm transition-colors",
                          active
                            ? "bg-indigo-600/15 text-indigo-300"
                            : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200",
                        )}
                        title={c.title}
                      >
                        {c.title}
                      </Link>
                      <button
                        onClick={(e) => deleteConversation(c.id, e)}
                        title="Hapus percakapan"
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-800 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA kecil */}
      <div className="mt-auto hidden pt-3 lg:block">
        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200",
            !activeId && "text-indigo-300",
          )}
        >
          <Plus className="h-4 w-4" /> Chat baru
        </Link>
      </div>
    </div>
  );
}
