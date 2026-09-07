import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client memakai service role key sehingga melewati RLS.
 * HANYA dipakai di server (Route Handler / proses internal).
 * Jangan pernah di-import dari komponen client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Environment belum lengkap: isi NEXT_PUBLIC_SUPABASE_URL dan " +
        "SUPABASE_SERVICE_ROLE_KEY di .env.local (lihat README bagian Setup).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
