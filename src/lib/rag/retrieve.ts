import type { SupabaseClient } from "@supabase/supabase-js";
import { embedTexts } from "@/lib/ai";

export interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  similarity: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  /** true bila ada chunk yang lolos threshold (konteks tersedia). */
  hasContext: boolean;
}

const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_TOP_K = 6;

/**
 * Cari chunk paling relevan milik user untuk sebuah pertanyaan.
 * Pemanggilan fungsi `match_document_chunks` dilakukan lewat client sesi user,
 * jadi RLS + parameter p_user_id memastikan hasilnya hanya dari data user ini.
 */
export async function retrieveContext(
  client: SupabaseClient,
  userId: string,
  query: string,
  options: { topK?: number; threshold?: number } = {},
): Promise<RetrievalResult> {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  const [embedding] = await embedTexts([query]);

  const { data: rows, error } = await client.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Gagal melakukan semantic search: ${error.message}`);
  }

  const matched = (rows ?? []) as {
    id: string;
    document_id: string;
    content: string;
    similarity: number;
  }[];

  if (matched.length === 0) {
    return { chunks: [], hasContext: false };
  }

  // Ambil judul dokumen untuk sumber jawaban.
  const documentIds = [...new Set(matched.map((r) => r.document_id))];
  const { data: docs } = await client
    .from("documents")
    .select("id, title")
    .in("id", documentIds);

  const titleById = new Map(
    (docs ?? []).map((d) => [d.id as string, d.title as string]),
  );

  const chunks: RetrievedChunk[] = matched.map((r) => ({
    chunk_id: r.id,
    document_id: r.document_id,
    document_title: titleById.get(r.document_id) ?? "Dokumen",
    content: r.content,
    similarity: r.similarity,
  }));

  return { chunks, hasContext: true };
}
