/**
 * Ekstraksi teks mentah dari file yang diupload user.
 * Library berat (unpdf/pdfjs, mammoth) di-import dinamis agar hanya dimuat
 * saat benar-benar dibutuhkan (server).
 */

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function isSupportedExtension(ext: string): boolean {
  return ext.toLowerCase() in EXT_TO_MIME;
}

export async function extractTextFromFile(
  data: ArrayBuffer,
  ext: string,
): Promise<string> {
  const extension = ext.toLowerCase();
  const bytes = new Uint8Array(data);

  switch (extension) {
    case "pdf": {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      return text ?? "";
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return result.value ?? "";
    }
    case "txt":
    case "md":
    case "markdown":
    default:
      return new TextDecoder("utf-8").decode(bytes);
  }
}
