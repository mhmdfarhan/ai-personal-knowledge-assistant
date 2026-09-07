import { NextResponse } from "next/server";
import { getSessionUser, jsonError } from "@/lib/api";
import { processDocument } from "@/lib/rag/pipeline";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const EXT_LABEL: Record<string, string> = {
  pdf: "PDF",
  txt: "TXT",
  md: "Markdown",
  markdown: "Markdown",
  docx: "DOCX",
};

function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || "file";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "file";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Gagal memuat daftar dokumen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const titleInput = formData.get("title");

  if (!(file instanceof File)) {
    return jsonError("File tidak ditemukan di request.");
  }
  if (file.size === 0) {
    return jsonError("File kosong.");
  }
  if (file.size > MAX_FILE_SIZE) {
    return jsonError("Ukuran file maksimal 10 MB.");
  }

  const baseName = sanitizeFileName(file.name);
  const dotIndex = baseName.lastIndexOf(".");
  const ext = dotIndex > -1 ? baseName.slice(dotIndex + 1).toLowerCase() : "";
  const allowedMime = ALLOWED_EXTENSIONS[ext];

  if (!allowedMime) {
    return jsonError(
      "Tipe file tidak didukung. Gunakan PDF, TXT, Markdown (.md), atau DOCX.",
    );
  }

  const title =
    typeof titleInput === "string" && titleInput.trim()
      ? titleInput.trim().slice(0, 200)
      : baseName;

  const supabase = await createClient();
  const objectPath = `${user.id}/${crypto.randomUUID()}-${baseName}`;

  // Upload ke bucket privat 'user-documents'. Policy storage membatasi path
  // ke folder milik user ini saja.
  const { error: uploadError } = await supabase.storage
    .from("user-documents")
    .upload(objectPath, file, {
      contentType: allowedMime,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Gagal mengupload file ke storage." },
      { status: 500 },
    );
  }

  const { data: document, error: dbError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      file_name: baseName,
      file_path: objectPath,
      mime_type: allowedMime,
      file_size: file.size,
      // Pipeline pemrosesan (ekstraksi → chunking → embedding) menyusul di
      // Milestone 3; status akan berubah menjadi PROCESSING → READY / FAILED.
      status: "UPLOADING",
      metadata: { extension: ext, type_label: EXT_LABEL[ext] },
    })
    .select("*")
    .single();

  if (dbError) {
    // Rollback: hapus file yang barusan diupload.
    await supabase.storage.from("user-documents").remove([objectPath]);
    return NextResponse.json(
      { error: "Gagal menyimpan metadata dokumen." },
      { status: 500 },
    );
  }

  // --- Milestone 3: jalankan pipeline RAG (extract → chunk → embed) ---
  const result = await processDocument(supabase, document.id);
  const finalDocument = result.document ?? document;

  return NextResponse.json(
    {
      document: finalDocument,
      processing: result.ok ? "READY" : "FAILED",
      processingError: result.error ?? undefined,
    },
    { status: 201 },
  );
}
