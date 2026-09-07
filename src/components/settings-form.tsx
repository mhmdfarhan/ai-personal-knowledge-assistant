"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function SettingsForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Profil berhasil diperbarui." });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setMessage({
        type: "error",
        text: data?.error ?? "Gagal memperbarui profil.",
      });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Nama lengkap</Label>
        <Input
          id="fullName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama kamu"
        />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
        <p className="mt-1.5 text-xs text-zinc-500">
          Email tidak dapat diubah dari sini.
        </p>
      </div>

      {message && (
        <p
          className={
            message.type === "success"
              ? "rounded-lg border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-400"
              : "rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-400"
          }
        >
          {message.text}
        </p>
      )}

      <Button type="submit" loading={saving}>
        Simpan perubahan
      </Button>
    </form>
  );
}
