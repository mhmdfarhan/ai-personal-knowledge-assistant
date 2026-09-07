import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { processDocument } from "@/lib/rag/pipeline";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Pastikan dokumen milik user ini (RLS juga memfilter di bawah).
  const { data: doc } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json(
      { error: "Dokumen tidak ditemukan." },
      { status: 404 },
    );
  }
  if (doc.status === "READY" || doc.status === "PROCESSING") {
    return NextResponse.json(
      { error: "Dokumen sedang diproses atau sudah siap." },
      { status: 409 },
    );
  }

  const result = await processDocument(supabase, id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Gagal memproses dokumen.", document: result.document },
      { status: 422 },
    );
  }

  return NextResponse.json({ document: result.document });
}
