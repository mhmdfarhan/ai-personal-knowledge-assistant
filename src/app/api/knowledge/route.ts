import { NextResponse } from "next/server";
import { getSessionUser, jsonError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

type KnowledgePayload = {
  title?: unknown;
  content?: unknown;
  category?: unknown;
  tags?: unknown;
};

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Gagal memuat knowledge." },
      { status: 500 },
    );
  }

  return NextResponse.json({ knowledge: data });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: KnowledgePayload;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body tidak valid.");
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : null;
  const tags = normalizeTags(body.tags);

  if (!title) return jsonError("Judul wajib diisi.");
  if (!content) return jsonError("Konten wajib diisi.");
  if (title.length > 200) return jsonError("Judul maksimal 200 karakter.");
  if (tags.length > 20) return jsonError("Maksimal 20 tag.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge")
    .insert({
      user_id: user.id,
      title,
      content,
      category,
      tags,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan knowledge." },
      { status: 500 },
    );
  }

  return NextResponse.json({ knowledge: data }, { status: 201 });
}
