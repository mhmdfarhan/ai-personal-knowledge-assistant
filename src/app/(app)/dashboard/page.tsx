import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Database,
  FileUp,
  Files,
  HardDrive,
  MessagesSquare,
  NotebookText,
  Sparkles,
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

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const [knowledgeCount, docsAgg, conversationCount] = await Promise.all([
    supabase.from("knowledge").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id, file_size").order("created_at", { ascending: false }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
  ]);

  const totalDocuments = docsAgg.data?.length ?? 0;
  const storageBytes = docsAgg.data?.reduce((sum, d) => sum + (d.file_size ?? 0), 0) ?? 0;
  const totalTokens = 0;

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    (user.user_metadata?.full_name as string | undefined) ||
    "Pengguna";

  const hasContent = (knowledgeCount.count ?? 0) > 0 || totalDocuments > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-[20px] border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-900/40 p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
              <Sparkles className="h-3 w-3" /> Personal AI Assistant
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
              Halo, {firstName} 👋
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
              Ringkasan knowledge pribadimu. Lanjut tanya AI atau tambah materi baru — semua terisolasi per akun.
            </p>
          </div>
          <Link
            href="/chat"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100"
          >
            <MessagesSquare className="h-4 w-4" /> Mulai chat <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={NotebookText} label="Knowledge" value={formatNumber(knowledgeCount.count ?? 0)} hint="Catatan & materi" />
        <StatCard icon={Files} label="Dokumen" value={formatNumber(totalDocuments)} hint="File yang diupload" accent="text-sky-400" />
        <StatCard icon={MessagesSquare} label="Percakapan" value={formatNumber(conversationCount.count ?? 0)} hint="Riwayat chat AI" accent="text-emerald-400" />
        <StatCard icon={HardDrive} label="Storage" value={formatBytes(storageBytes)} hint={`${formatNumber(totalTokens)} token terpakai`} accent="text-amber-400" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/chat" className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur transition hover:border-zinc-700 hover:bg-zinc-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-100">Tanya AI</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">Jawaban grounded dari knowledge-mu + sitasi.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:text-indigo-300">Buka chat <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link href="/knowledge/new" className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur transition hover:border-zinc-700 hover:bg-zinc-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800 text-zinc-200">
            <NotebookText className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-100">Buat Knowledge</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">Tulis catatan baru untuk ditanya nanti.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-300 group-hover:text-zinc-100">Tambah <ArrowRight className="h-3 w-3" /></span>
        </Link>
        <Link href="/documents" className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur transition hover:border-zinc-700 hover:bg-zinc-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800 text-zinc-200">
            <FileUp className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-100">Upload Dokumen</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">PDF, DOCX, MD, TXT hingga 10 MB.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-300 group-hover:text-zinc-100">Upload <ArrowRight className="h-3 w-3" /></span>
        </Link>
      </div>

      {!hasContent && (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/20 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/70">
            <Database className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-200">Belum ada knowledge</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
            Mulai dengan menulis catatan knowledge atau mengupload dokumen pertamamu. Nanti kamu bisa bertanya apa saja melalui AI.
          </p>
        </div>
      )}
    </div>
  );
}
