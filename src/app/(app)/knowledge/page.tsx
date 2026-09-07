import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, NotebookText } from "lucide-react";
import { KnowledgeActions } from "@/components/knowledge-actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Knowledge } from "@/types/database";

export const metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("knowledge")
    .select("*")
    .order("created_at", { ascending: false });

  const knowledge = (data ?? []) as Knowledge[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Knowledge</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Catatan, materi, dan informasi pribadi kamu.
          </p>
        </div>
        <Link
          href="/knowledge/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <FilePlus2 className="h-4 w-4" /> Buat Knowledge
        </Link>
      </div>

      {knowledge.length === 0 ? (
        <EmptyState
          icon={NotebookText}
          title="Belum ada knowledge"
          description="Buat catatan pengetahuan pertamamu — nanti bisa ditanyakan langsung ke AI."
          action={
            <Link
              href="/knowledge/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <FilePlus2 className="h-4 w-4" /> Buat Knowledge
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {knowledge.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/knowledge/${item.id}/edit`}
                  className="min-w-0 flex-1 text-base font-semibold text-zinc-100 hover:text-indigo-300"
                >
                  <span className="line-clamp-1">{item.title}</span>
                </Link>
                <KnowledgeActions id={item.id} />
              </div>

              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                {item.content}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {item.category && (
                  <Badge variant="info">{item.category}</Badge>
                )}
                {(item.tags ?? []).slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <p className="mt-4 text-xs text-zinc-600">
                Diperbarui {formatDate(item.updated_at ?? item.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
