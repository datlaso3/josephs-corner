-- =====================================================================
-- Joseph's Corner — Supabase schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It is idempotent (safe to re-run).
-- =====================================================================

-- 1. Documents table -------------------------------------------------------

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text,
  tags        text[],
  file_path   text not null,
  file_type   text not null check (file_type in ('pdf', 'docx', 'pptx', 'md')),
  file_size   bigint not null check (file_size >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists documents_created_at_idx
  on public.documents (created_at desc);

create index if not exists documents_category_idx
  on public.documents (category);

create index if not exists documents_tags_idx
  on public.documents using gin (tags);

-- 2. Row Level Security ----------------------------------------------------
-- Anyone can read. Writes happen through the service role on the server,
-- which bypasses RLS, so we don't need a write policy here.

alter table public.documents enable row level security;

drop policy if exists "documents_public_read" on public.documents;
create policy "documents_public_read"
  on public.documents
  for select
  to anon, authenticated
  using (true);

-- 3. Storage bucket --------------------------------------------------------
-- Public read so /doc pages can render PDFs and download files directly.
-- Writes happen via the service role from the upload API route.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = excluded.public;

-- Allow anonymous reads on objects in the documents bucket.
drop policy if exists "documents_bucket_public_read" on storage.objects;
create policy "documents_bucket_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'documents');

-- 4. Quiz banks table -------------------------------------------------------

create table if not exists public.quiz_banks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.quiz_banks enable row level security;

drop policy if exists "quiz_banks_public_read" on public.quiz_banks;
create policy "quiz_banks_public_read"
  on public.quiz_banks
  for select to anon, authenticated using (true);

-- 5. Quiz questions table ----------------------------------------------------

create table if not exists public.quiz_questions (
  id           uuid primary key default gen_random_uuid(),
  quiz_bank_id uuid not null references public.quiz_banks(id) on delete cascade,
  sort_order   integer not null default 0,
  question     text not null,
  options      jsonb not null,
  correct      text not null,
  explanation  text,
  chapter      text,
  created_at   timestamptz not null default now()
);

create index if not exists quiz_questions_bank_order_idx
  on public.quiz_questions (quiz_bank_id, sort_order);

alter table public.quiz_questions enable row level security;

drop policy if exists "quiz_questions_public_read" on public.quiz_questions;
create policy "quiz_questions_public_read"
  on public.quiz_questions
  for select to anon, authenticated using (true);

-- 6. Quiz jobs table -------------------------------------------------------
-- Stores async quiz generation jobs. All access is via service role.

create table if not exists public.quiz_jobs (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'done', 'error')),
  result      jsonb,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists quiz_jobs_document_id_idx
  on public.quiz_jobs (document_id);

-- =====================================================================
-- That's it. The Next.js app talks to this schema via:
--   * anon key  -> public reads (homepage, doc page)
--   * service role key (server only) -> uploads + deletes
-- =====================================================================
