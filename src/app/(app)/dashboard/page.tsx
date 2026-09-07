import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Database,
  FileUp,
  Files,
  HardDrive,
  MessagesSquare,
  NotebookText,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { formatBytes, formatNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const [knowledgeCount, docsAgg, conversationCount] = await Promise.all([
    supabase
      .from("knowledge")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id, file_size")
      .order("created_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true }),
  ]);

  const totalDocuments = docsAgg.data?.length ?? 0;
  const storageBytes = docsAgg.data?.reduce(
    (sum, d) => sum + (d.file_size ?? 0),
    0,
  ) ?? 0;
  // Token usage dicatat mulai Milestone 4 (chat). Dashboard siap menampilkannya.
  const totalTokens = 0;

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    (user.user_metadata?.full_name as string | undefined) ||
    "Pengguna";

  const hasContent = (knowledgeCount.count ?? 0) > 0 || totalDocuments > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Halo, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ringkasan knowledge pribadi kamu.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={NotebookText}
          label="Knowledge"
          value={formatNumber(knowledgeCount.count ?? 0)}
          hint="Catatan & materi"
        />
        <StatCard
          icon={Files}
          label="Dokumen"
          value={formatNumber(totalDocuments)}
          hint="File yang diupload"
          accent="text-sky-400"
        />
        <StatCard
          icon={MessagesSquare}
          label="Percakapan"
          value={formatNumber(conversationCount.count ?? 0)}
          hint="Riwayat chat AI"
          accent="text-emerald-400"
        />
        <StatCard
          icon={HardDrive}
          label="Storage"
          value={formatBytes(storageBytes)}
          hint={`${formatNumber(totalTokens)} token terpakai`}
          accent="text-amber-400"
        />
      </div>

      {!hasContent && (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/70">
            <Database className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-200">
            Belum ada knowledge
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Mulai dengan menulis catatan knowledge atau mengupload dokumen
            pertamamu. Nanti kamu bisa bertanya apa saja melalui AI.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/knowledge/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <NotebookText className="h-4 w-4" /> Buat Knowledge
            </Link>
            <Link
              href="/documents"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-4 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              <FileUp className="h-4 w-4" /> Upload Dokumen
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
