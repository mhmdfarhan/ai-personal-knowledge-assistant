import { NextResponse } from "next/server";
import { getSessionUser, jsonError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { full_name?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body tidak valid.");
  }

  const fullName = body.full_name?.trim() ?? "";
  if (fullName.length > 100) {
    return jsonError("Nama maksimal 100 karakter.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id)
    .select("id, full_name, email")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Gagal memperbarui profil." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: data });
}
