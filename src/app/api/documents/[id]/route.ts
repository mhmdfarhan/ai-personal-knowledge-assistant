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
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Dokumen tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ document: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("documents")
    .select("id, file_path")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Dokumen tidak ditemukan." },
      { status: 404 },
    );
  }

  // Hapus file dari storage dulu, baru hapus record.
  if (existing.file_path) {
    const { error: storageError } = await supabase.storage
      .from("user-documents")
      .remove([existing.file_path]);
    if (storageError) {
      return NextResponse.json(
        { error: "Gagal menghapus file dari storage." },
        { status: 500 },
      );
    }
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Gagal menghapus dokumen." },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
