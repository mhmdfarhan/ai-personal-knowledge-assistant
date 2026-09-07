"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Knowledge } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function KnowledgeForm({
  initial,
}: {
  initial?: Knowledge;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      title,
      content,
      category,
      tags,
    };

    const res = await fetch(
      isEdit ? `/api/knowledge/${initial.id}` : "/api/knowledge",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan knowledge.");
      setSaving(false);
      return;
    }

    router.push("/knowledge");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Judul</Label>
        <Input
          id="title"
          required
          maxLength={200}
          placeholder="mis. Deploy React ke VPS"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="content">Konten</Label>
        <Textarea
          id="content"
          required
          rows={14}
          placeholder="Tulis pengetahuan kamu di sini. Mendukung teks Markdown…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-[13px] leading-relaxed"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Kategori</Label>
          <Input
            id="category"
            list="category-options"
            placeholder="mis. Development"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="category-options">
            <option value="Development" />
            <option value="Belajar" />
            <option value="Pekerjaan" />
            <option value="Catatan" />
            <option value="Lainnya" />
          </datalist>
        </div>
        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="react, nginx, vps (pisahkan dengan koma)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {isEdit ? "Simpan perubahan" : "Buat knowledge"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/knowledge")}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
