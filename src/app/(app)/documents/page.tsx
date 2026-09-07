import { redirect } from "next/navigation";
import { DocumentsPanel } from "@/components/documents-panel";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/types/database";

export const metadata = { title: "Dokumen" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  const documents = (data ?? []) as Document[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dokumen</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload file (PDF, TXT, Markdown, DOCX) untuk ditanyakan ke AI.
        </p>
      </div>

      <DocumentsPanel initialDocuments={documents} />
    </div>
  );
}
