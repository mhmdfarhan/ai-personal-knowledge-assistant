import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, file_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json(
      { error: "Dokumen tidak ditemukan." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase.storage
    .from("user-documents")
    .createSignedUrl(doc.file_path, 60 * 30); // berlaku 30 menit

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "Gagal membuat tautan dokumen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
