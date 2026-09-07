import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "Gagal memuat percakapan." },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversations: data });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "Percakapan baru";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Gagal membuat percakapan." },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
