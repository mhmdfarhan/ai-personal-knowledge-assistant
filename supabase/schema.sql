-- ============================================================================
-- Personal AI Knowledge Assistant — Schema SQL (MVP)
-- Jalankan file ini SEKALI di Supabase Dashboard → SQL Editor → New query.
--
-- Isi:
--   1. pgvector extension
--   2. Tabel: profiles, knowledge, documents, document_chunks,
--      conversations, messages
--   3. Row Level Security (RLS) di semua tabel inti
--   4. Trigger otomatis profil + updated_at
--   5. Storage bucket privat 'user-documents' + policy
--   6. Fungsi vector search (match_document_chunks) untuk Milestone 3+
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extension
-- ---------------------------------------------------------------------------
-- Instal ke schema default agar tipe `vector` bisa dipakai tanpa kualifikasi
-- di seluruh search_path (SQL Editor maupun aplikasi).
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- 2. Helper: trigger updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- PROFILES
-- ===========================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- Auto-buat profil saat user baru mendaftar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- KNOWLEDGE (catatan manual user)
-- ===========================================================================
create table if not exists public.knowledge (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  content     text not null,
  category    text,
  tags        text[] not null default '{}',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists knowledge_user_id_idx on public.knowledge (user_id);

drop trigger if exists knowledge_set_updated_at on public.knowledge;
create trigger knowledge_set_updated_at
  before update on public.knowledge
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- DOCUMENTS (file yang diupload user)
-- ===========================================================================
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  file_name   text not null,
  file_path   text not null,      -- path di Supabase Storage: {user_id}/{nama-file}
  mime_type   text,
  file_size   bigint not null default 0,
  status      text not null default 'UPLOADING'
              check (status in ('UPLOADING', 'PROCESSING', 'READY', 'FAILED')),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists documents_user_id_idx on public.documents (user_id);

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- DOCUMENT_CHUNKS (hasil chunking + embedding — dipakai Milestone 3)
-- ===========================================================================
create table if not exists public.document_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  content      text not null,
  chunk_index  integer not null default 0,
  -- Dimensi mengikuti embedding model (OpenAI text-embedding-3-small = 1536).
  -- Jika model embedding diganti, jalankan:
  --   alter table public.document_chunks alter column embedding type vector(<dimensi-baru>);
  embedding    vector(1536),
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists document_chunks_user_id_idx
  on public.document_chunks (user_id);
create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id);
-- Index HNSW untuk similarity search yang cepat.
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- ===========================================================================
-- CONVERSATIONS & MESSAGES (chat — dipakai Milestone 4)
-- ===========================================================================
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Percakapan baru',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists conversations_user_id_idx
  on public.conversations (user_id, updated_at desc);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  role              text not null check (role in ('system', 'user', 'assistant')),
  content           text not null,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id, created_at);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- Prinsip PRD: isolasi data di level DATABASE (auth.uid() = user_id),
-- bukan hanya filter WHERE di application layer.
-- ===========================================================================

alter table public.profiles         enable row level security;
alter table public.knowledge        enable row level security;
alter table public.documents        enable row level security;
alter table public.document_chunks  enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;

-- PROFILES: user hanya bisa baca & update profilnya sendiri.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- KNOWLEDGE
drop policy if exists "knowledge_all_own" on public.knowledge;
create policy "knowledge_all_own" on public.knowledge
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DOCUMENTS
drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DOCUMENT_CHUNKS
drop policy if exists "document_chunks_all_own" on public.document_chunks;
create policy "document_chunks_all_own" on public.document_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CONVERSATIONS
drop policy if exists "conversations_all_own" on public.conversations;
create policy "conversations_all_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MESSAGES
drop policy if exists "messages_all_own" on public.messages;
create policy "messages_all_own" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===========================================================================
-- STORAGE: bucket privat 'user-documents'
-- Path file: {user_id}/{nama-file} → policy memakai folder pertama path.
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('user-documents', 'user-documents', false)
on conflict (id) do nothing;

drop policy if exists "user_documents_select_own" on storage.objects;
create policy "user_documents_select_own" on storage.objects
  for select using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_documents_insert_own" on storage.objects;
create policy "user_documents_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_documents_update_own" on storage.objects;
create policy "user_documents_update_own" on storage.objects
  for update using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_documents_delete_own" on storage.objects;
create policy "user_documents_delete_own" on storage.objects
  for delete using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================================================
-- FUNGSI VECTOR SEARCH (RAG — dipakai mulai Milestone 3)
-- Retrieval diisolasi lewat parameter user_id + RLS (security definer TIDAK
-- dipakai supaya policy RLS tetap aktif).
-- Catatan: semua parameter WAJIB diisi (tanpa default) karena PostgreSQL
-- melarang parameter tanpa default mengikuti parameter ber-default (42P13).
-- ===========================================================================
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id          uuid,
  document_id uuid,
  content     text,
  chunk_index integer,
  similarity  float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.user_id = p_user_id
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_document_chunks(
  vector, float, int, uuid
) from public, anon;
grant execute on function public.match_document_chunks(
  vector, float, int, uuid
) to authenticated;
