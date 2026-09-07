"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

export function KnowledgeActions({ id }: { id: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Hapus knowledge ini? Tindakan ini tidak bisa dibatalkan.")) {
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      window.alert("Gagal menghapus knowledge.");
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/knowledge/${id}/edit`}
        title="Edit"
        className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Hapus"
        className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-950 hover:text-red-400 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
