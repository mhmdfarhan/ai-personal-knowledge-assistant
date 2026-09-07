import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTexts, getEmbeddingModel } from "@/lib/ai";
import { chunkText } from "@/lib/documents/chunk";
import {
  extractTextFromFile,
  isSupportedExtension,
} from "@/lib/documents/extract";
import type { Document } from "@/types/database";

export interface ProcessingResult {
  ok: boolean;
  error?: string;
  document?: Document;
}

const CHUNK_INSERT_BATCH = 25;

function envInt(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * Proses satu dokumen: download dari storage → ekstraksi teks → chunking →
 * embedding → simpan ke document_chunks → status READY.
 * Status dokumen mengikuti: UPLOADING → PROCESSING → READY / FAILED.
 *
 * Semua operasi memakai client sesi user (RLS aktif), jadi dokumen/chunks
 * milik user lain tidak mungkin tersentuh.
 */
export async function processDocument(
  client: SupabaseClient,
  documentId: string,
): Promise<ProcessingResult> {
  const { data: doc } = await client
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) {
    return { ok: false, error: "Dokumen tidak ditemukan." };
  }

  const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
  const startedAt = Date.now();

  const markProcessing = async () => {
    await client
      .from("documents")
      .update({
        status: "PROCESSING",
        metadata: { ...metadata, processing_started_at: new Date().toISOString() },
      })
      .eq("id", documentId);
  };

  const markDone = async (patch: { status: string; metadata: Record<string, unknown> }) => {
    const { data } = await client
      .from("documents")
      .update(patch)
      .eq("id", documentId)
      .select("*")
      .single();
    return data as Document | undefined;
  };

  await markProcessing();

  try {
    const ext = String(metadata.extension ?? doc.file_name.split(".").pop() ?? "").toLowerCase();
    if (!isSupportedExtension(ext)) {
      throw new Error("Tipe file tidak didukung untuk diproses.");
    }

    const { data: fileBlob, error: downloadError } = await client.storage
      .from("user-documents")
      .download(doc.file_path);
    if (downloadError || !fileBlob) {
      throw new Error("Gagal mengunduh file dari storage.");
    }

    const text = await extractTextFromFile(await fileBlob.arrayBuffer(), ext);
    if (!text.trim()) {
      throw new Error("Tidak ada teks yang bisa diekstrak dari file ini.");
    }

    const chunkOptions = {
      maxChars: envInt("CHUNK_MAX_CHARS", 4000),
      overlap: envInt("CHUNK_OVERLAP", 400),
    };
    const chunks = chunkText(text, chunkOptions);
    if (chunks.length === 0) {
      throw new Error("Dokumen tidak menghasilkan chunk yang valid.");
    }

    const embeddingModel = getEmbeddingModel();
    const embeddings = await embedTexts(chunks, embeddingModel);

    // Hapus chunk lama dulu (aman untuk proses ulang / retry).
    await client
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);

    for (let i = 0; i < chunks.length; i += CHUNK_INSERT_BATCH) {
      const batch = chunks.slice(i, i + CHUNK_INSERT_BATCH);
      const rows = batch.map((content, j) => ({
        document_id: documentId,
        user_id: doc.user_id,
        content,
        chunk_index: i + j,
        embedding: embeddings[i + j],
      }));
      const { error: insertError } = await client
        .from("document_chunks")
        .insert(rows);
      if (insertError) {
        throw new Error(`Gagal menyimpan chunk: ${insertError.message}`);
      }
    }

    const durationMs = Date.now() - startedAt;
    const done = await markDone({
      status: "READY",
      metadata: {
        ...metadata,
        chunk_count: chunks.length,
        characters: text.length,
        embedding_model: embeddingModel,
        chunk_options: chunkOptions,
        processing_duration_ms: durationMs,
        processing_finished_at: new Date().toISOString(),
        error: undefined,
      },
    });

    return { ok: true, document: done };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan saat memproses dokumen.";
    const failed = await markDone({
      status: "FAILED",
      metadata: {
        ...metadata,
        error: message,
        processing_failed_at: new Date().toISOString(),
        processing_duration_ms: Date.now() - startedAt,
      },
    });
    return { ok: false, error: message, document: failed };
  }
}
