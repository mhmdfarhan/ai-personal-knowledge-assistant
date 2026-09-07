"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Info,
  RotateCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";
import type { Document, DocumentStatus } from "@/types/database";

const ACCEPTED = ".pdf,.txt,.md,.markdown,.docx";

const STATUS_VARIANT: Record<
  DocumentStatus,
  "warning" | "info" | "success" | "danger"
> = {
  UPLOADING: "warning",
  PROCESSING: "info",
  READY: "success",
  FAILED: "danger",
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  UPLOADING: "Uploading…",
  PROCESSING: "Memproses…",
  READY: "Siap",
  FAILED: "Gagal",
};

type UploadResponse = {
  document?: Document;
  processing?: "READY" | "FAILED";
  processingError?: string;
  error?: string;
};

export function DocumentsPanel({
  initialDocuments,
}: {
  initialDocuments: Document[];
}) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refreshList() {
    const res = await fetch("/api/documents", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents ?? []);
    }
  }

  async function uploadFile(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as UploadResponse | null;
      if (!res.ok) {
        setUploadError(data?.error ?? "Gagal mengupload dokumen.");
      } else if (data?.processing === "FAILED") {
        setUploadError(
          data.processingError ??
            "Dokumen gagal diproses. Gunakan tombol 'Coba lagi' untuk mengulang.",
        );
      }
      await refreshList();
    } catch {
      setUploadError("Gagal mengupload dokumen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus dokumen ini?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  }

  async function handleRetry(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/documents/${id}/process`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setUploadError(data?.error ?? "Gagal memproses ulang dokumen.");
    } else {
      setUploadError(null);
    }
    await refreshList();
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Area upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors " +
          (dragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700")
        }
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20">
          <UploadCloud className="h-6 w-6 text-indigo-400" />
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-200">
          {uploading ? "Mengupload & memproses…" : "Klik atau seret file ke sini"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          PDF, TXT, Markdown, DOCX · maksimal 10 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploadError && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {uploadError}
        </p>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
        <p>
          Setelah upload, dokumen otomatis diproses: ekstraksi teks → chunking
          → embedding, lalu berstatus{" "}
          <span className="text-zinc-300">Siap</span> dan siap dicari secara
          semantik. Dokumen yang gagal bisa diulang lewat tombol{" "}
          <span className="text-zinc-300">Coba lagi</span>.
        </p>
      </div>

      {/* Daftar dokumen */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 px-6 py-14 text-center">
          <p className="text-sm font-medium text-zinc-200">
            Belum ada dokumen
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Upload dokumen pertamamu, lalu tanyakan isinya ke AI.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {documents.map((doc, i) => {
            const meta = (doc.metadata ?? {}) as Record<string, unknown>;
            return (
              <div
                key={doc.id}
                className={
                  "flex flex-wrap items-center gap-3 bg-zinc-900/50 px-4 py-3.5 sm:flex-nowrap " +
                  (i > 0 ? "border-t border-zinc-800/80" : "")
                }
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                  <FileText className="h-4 w-4 text-zinc-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {doc.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {doc.mime_type === "text/markdown"
                      ? "Markdown"
                      : doc.mime_type === "text/plain"
                        ? "TXT"
                        : String(meta.type_label ?? doc.file_name).toUpperCase()}{" "}
                    · {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                    {doc.status === "READY" && typeof meta.chunk_count === "number"
                      ? ` · ${meta.chunk_count} chunk`
                      : ""}
                    {doc.status === "FAILED" && meta.error
                      ? ` · ${String(meta.error)}`
                      : ""}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[doc.status]}>
                  {STATUS_LABEL[doc.status]}
                </Badge>
                {doc.status === "FAILED" && (
                  <Button
                    variant="secondary"
                    size="icon"
                    title="Coba proses lagi"
                    disabled={busyId === doc.id}
                    onClick={() => handleRetry(doc.id)}
                  >
                    <RotateCw
                      className={
                        "h-4 w-4 " + (busyId === doc.id ? "animate-spin" : "")
                      }
                    />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Hapus"
                  disabled={busyId === doc.id}
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
