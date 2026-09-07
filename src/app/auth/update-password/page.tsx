"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setHasSession(!!data.user);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setLoading(false);
      setError("Password minimal 6 karakter.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("Gagal memperbarui password. Silakan coba lagi.");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (checking) {
    return <p className="py-10 text-center text-sm text-zinc-400">Memuat…</p>;
  }

  if (!hasSession) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-zinc-400">
          Sesi tidak ditemukan. Gunakan tautan dari email reset password kamu.
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          Kembali ke Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Buat password baru
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Masukkan password baru untuk akun kamu.
        </p>
      </div>

      <div>
        <Label htmlFor="password">Password baru</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Minimal 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        Simpan password baru
      </Button>
    </form>
  );
}
