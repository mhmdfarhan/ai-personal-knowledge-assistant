import { NextResponse } from "next/server";
import { getSessionUser, jsonError } from "@/lib/api";
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
    .from("knowledge")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Knowledge tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ knowledge: data });
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body tidak valid.");
  }

  const { id } = await params;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : null;

  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  if (!title) return jsonError("Judul wajib diisi.");
  if (!content) return jsonError("Konten wajib diisi.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge")
    .update({ title, content, category, tags })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Knowledge tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Gagal memperbarui knowledge." },
      { status: 500 },
    );
  }

  return NextResponse.json({ knowledge: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("knowledge")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Knowledge tidak ditemukan." },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("knowledge")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Gagal menghapus knowledge." },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
