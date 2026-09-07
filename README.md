# Personal AI Knowledge Assistant

Asisten AI untuk knowledge pribadi — simpan catatan/dokumen, lalu bertanya lewat chat
berbasis **Retrieval-Augmented Generation (RAG)**. Dibangun dari
[PRD](./docs/Personal%20AI%20Knowledge%20Assistant%20PRD.pdf) (ringkasan teks:
[`docs/prd-extracted.txt`](./docs/prd-extracted.txt)).

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend & Backend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS |
| Auth, DB, Storage | Supabase (Auth, PostgreSQL + pgvector, Storage privat) |
| AI (M3+) | OpenRouter — satu API key untuk chat **dan** embedding (OpenAI-compatible) |
| Keamanan data | Row Level Security (`auth.uid() = user_id`) di semua tabel inti |

## Status Milestone

| Milestone | Fitur | Status |
| --- | --- | --- |
| M1 — Foundation | Auth (register/login/logout/reset password), profil, dashboard, RLS | ✅ Selesai |
| M2 — Knowledge | CRUD knowledge, upload dokumen (PDF/TXT/MD/DOCX ≤ 10 MB) ke storage privat + metadata | ✅ Selesai |
| M3 — RAG Pipeline | Ekstraksi teks, chunking, embedding → pgvector, semantic search | ✅ Selesai |
| M4 — AI Chat | Conversation, retrieval, prompt RAG, streaming jawaban | ✅ Selesai |
| M5 — Source & Polish | Source citation di UI, render markdown + syntax highlight, typing indicator | ✅ Selesai |

## Menjalankan Project

### 1. Prasyarat

- Node.js ≥ 20
- Akun Supabase (gratis) — buat project baru di <https://supabase.com/dashboard>
- (Untuk M3+) API key OpenRouter dari <https://openrouter.ai/keys>

### 2. Setup database

1. Buka project Supabase → **SQL Editor**.
2. Jalankan seluruh isi file [`supabase/schema.sql`](./supabase/schema.sql) sekali.
   File ini membuat: tabel `profiles`, `knowledge`, `documents`, `document_chunks`,
   `conversations`, `messages`, RLS di semua tabel, trigger profil otomatis, bucket
   storage privat `user-documents` + policy, dan fungsi vector search
   `match_document_chunks`.

### 3. Konfigurasi Supabase Auth

Di **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: tambahkan `http://localhost:3000/auth/callback`

> Untuk pengembangan lokal yang cepat, kamu bisa mematikan **"Confirm email"**
> di Authentication → Providers → Email. Kalau tetap aktif, register akan
> mengirim email konfirmasi (template default sudah cukup).

### 4. Environment variables

```bash
cp .env.example .env.local
```

Isi nilai dari **Project Settings → API**, plus API key AI:

```env
NEXT_PUBLIC_SUPABASE_URL=      # Project URL, mis. https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY= # anon public key
SUPABASE_SERVICE_ROLE_KEY=     # service_role key (server-only, RAHASIA)

# AI (OpenRouter — satu key untuk chat & embedding, buat di https://openrouter.ai/keys)
LLM_API_KEY=
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_CHAT_MODEL=openrouter/auto
EMBEDDING_MODEL=openai/text-embedding-3-small   # dimensi 1536 = vector(1536) di DB
```

Opsional untuk tuning chunking:

```env
CHUNK_MAX_CHARS=4000   # ≈ 1000 token per chunk
CHUNK_OVERLAP=400      # ≈ 100 token overlap
```

### 5. Jalankan

```bash
npm install
npm run dev
```

Buka <http://localhost:3000> → daftar akun → mulai menulis knowledge atau upload dokumen.

## Struktur Folder

```
src/
  proxy.ts              # Auth guard jaringan (Next 16: pengganti middleware)
  app/
    (auth)/             # login, register, forgot-password
    (app)/              # halaman terproteksi + sidebar: dashboard, knowledge, documents, settings
    auth/               # callback OAuth, update password, error page
    api/                # Route Handlers: knowledge, documents, profile
  components/           # UI + komponen fitur (sidebar, form, dll.)
  lib/
    supabase/           # client browser / server / admin (service role)
    api.ts              # helper auth untuk Route Handlers
  types/                # tipe row database
supabase/
  schema.sql            # jalankan sekali di SQL Editor Supabase
docs/                   # PRD (PDF + teks)
```

## API (sesuai PRD)

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET/POST | `/api/knowledge` | List & buat knowledge |
| GET/PUT/DELETE | `/api/knowledge/:id` | Detail, ubah, hapus |
| GET/POST | `/api/documents` | List & upload (multipart) + pipeline RAG otomatis |
| GET/DELETE | `/api/documents/:id` | Detail & hapus |
| POST | `/api/documents/:id/process` | Proses ulang dokumen FAILED (retry) |
| GET/POST | `/api/conversations` | List & buat percakapan |
| GET/DELETE | `/api/conversations/:id` | Detail (dengan pesan) & hapus |
| POST | `/api/chat` | Kirim pertanyaan → **jawaban streaming** (text/plain) + RAG |
| PUT | `/api/profile` | Update profil |

## Catatan Keamanan (diterapkan)

- RLS aktif di database untuk `profiles`, `knowledge`, `documents`,
  `document_chunks`, `conversations`, `messages` — isolasi data per `auth.uid()`.
- Storage bucket `user-documents` **privat**; policy hanya mengizinkan akses ke
  path `{user_id}/…` milik sendiri.
- `SUPABASE_SERVICE_ROLE_KEY` dan API key AI hanya dipakai di server
  (`lib/supabase/admin.ts` di-import dari Route Handler saja, tidak dari client).
- Semua Route Handler memverifikasi sesi lewat `supabase.auth.getUser()`.

## Catatan Teknis Chat
- Streaming via `POST /api/chat` → `text/plain` bertahap; header
  `X-Conversation-Id` & `X-Context-Found`.
- Jawaban hanya berdasar konteks yang ditemukan (mode Knowledge Only). Tanpa
  konteks relevan → jawaban jujur tanpa memanggil LLM (hallucination control).
- Metadata assistant message menyimpan `sources` (untuk citation M5), `usage`,
  dan `model` (untuk cost control PRD §42).

## Skrip Verifikasi

```bash
# Verifikasi keamanan (RLS antar user, storage privat, isolasi vector search)
# Membuat user test + data, lalu membersihkannya sendiri.
node --env-file=.env.local scripts/verify-security.mjs

# E2E Milestone 3 — butuh dev server berjalan (npm run dev):
# upload MD + PDF asli → pipeline → status READY → semantic search
node --env-file=.env.local scripts/e2e-m3.mjs

# E2E Milestone 4/5 — butuh dev server berjalan:
# upload → tanya → jawaban streaming grounded + sumber + jalur tanpa konteks
node --env-file=.env.local scripts/e2e-m4.mjs
```

## Fitur & Catatan Tambahan

- Jawaban AI dirender sebagai **Markdown (GFM)** dengan **syntax highlighting**
  (prism, bahasa umum) + tombol salin pada blok kode.
- Kartu **Sumber** muncul di bawah jawaban; klik untuk membuka dokumen asli
  melalui signed URL (`GET /api/documents/:id/file`).
- MVP selesai: M1 Foundation, M2 Knowledge, M3 RAG Pipeline, M4 AI Chat,
  M5 Source & Polish.
