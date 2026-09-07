export interface ChunkOptions {
  /** Perkiraan ukuran chunk dalam karakter (~4 karakter ≈ 1 token). */
  maxChars?: number;
  /** Jumlah karakter yang di-overlap antar chunk. */
  overlap?: number;
}

export const DEFAULT_CHUNK_OPTIONS: Required<ChunkOptions> = {
  maxChars: 4000, // ≈ 1000 token
  overlap: 400,   // ≈ 100 token
};

/** Normalisasi teks hasil ekstraksi sebelum di-chunk. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Potong teks menjadi chunk berurutan dengan overlap.
 * Pemotongan diusahakan pada batas baris/spasi agar tidak memecah kata.
 */
export function chunkText(
  raw: string,
  options: ChunkOptions = {},
): string[] {
  const { maxChars, overlap } = { ...DEFAULT_CHUNK_OPTIONS, ...options };
  const text = normalizeText(raw);
  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    if (end < text.length) {
      // Cari batas baris baru terakhir di dalam window, lalu batas spasi.
      const lastNewline = text.lastIndexOf("\n", end);
      const boundary = lastNewline > start ? lastNewline : text.lastIndexOf(" ", end);
      if (boundary > start) end = boundary;
    }

    const slice = text.slice(start, end).trim();
    if (slice) chunks.push(slice);

    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
