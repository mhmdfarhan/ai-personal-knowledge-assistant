import type { ChatMessage } from "@/lib/ai";
import type { RetrievedChunk } from "@/lib/rag/retrieve";

const SYSTEM_PROMPT = `Kamu adalah asisten knowledge pribadi bernama Personal AI Assistant.

Aturan:
1. Jawab pertanyaan pengguna HANYA berdasarkan konteks knowledge yang diberikan (bagian KONTEKS).
2. Jika jawaban tidak ditemukan di dalam konteks, katakan dengan jujur:
   "Saya tidak menemukan informasi tersebut di knowledge base kamu."
3. JANGAN membuat/mengarang informasi yang tidak ada di konteks.
4. Saat menjawab berdasarkan konteks, sebutkan nomor sumbernya, mis. "[1]", sesuai daftar KONTEKS.
5. Jawab dalam bahasa yang sama dengan pertanyaan pengguna.`;

export const NO_CONTEXT_ANSWER =
  "Saya tidak menemukan informasi tersebut di knowledge base kamu. Coba tanyakan hal lain atau tambahkan dokumen/catatan yang relevan terlebih dahulu.";

export function buildContextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[Sumber ${i + 1}] ${c.document_title} (relevansi ${c.similarity.toFixed(2)})\n${c.content}`,
    )
    .join("\n\n---\n\n");
}

/**
 * Susun pesan untuk LLM:
 *   system instructions + retrieved context + conversation history + question.
 */
export function buildRagMessages(params: {
  question: string;
  contextChunks: RetrievedChunk[];
  history: ChatMessage[];
}): ChatMessage[] {
  const { question, contextChunks, history } = params;

  const contextBlock = buildContextBlock(contextChunks);
  const contextInstruction =
    contextChunks.length > 0
      ? `KONTEKS (knowledge milik user):\n${contextBlock}\n\nJawab pertanyaan di bawah hanya berdasarkan KONTEKS di atas.`
      : "TIDAK ADA KONTEKS yang relevan ditemukan di knowledge base user. Jawab sesuai aturan 2 dan 3.";

  const userPrompt = `${contextInstruction}\n\nPertanyaan:\n${question}`;

  // Riwayat dibatasi agar tidak meledakkan konteks; pesan context disuntikkan
  // ke user prompt saat ini (bukan masuk ke history).
  const recentHistory = history.slice(-8);

  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentHistory,
    { role: "user", content: userPrompt },
  ];
}
