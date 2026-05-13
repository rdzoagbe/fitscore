-- Joblytics AI — P3C cover letter history
-- Run in Supabase Dashboard > SQL Editor. Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete set null,
  job_title text,
  company text,
  recipient text,
  tone text,
  length text,
  language text,
  letter text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cover_letters add column if not exists analysis_id uuid references public.analyses(id) on delete set null;
alter table public.cover_letters add column if not exists job_title text;
alter table public.cover_letters add column if not exists company text;
alter table public.cover_letters add column if not exists recipient text;
alter table public.cover_letters add column if not exists tone text;
alter table public.cover_letters add column if not exists length text;
alter table public.cover_letters add column if not exists language text;
alter table public.cover_letters add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.cover_letters add column if not exists created_at timestamptz not null default now();
alter table public.cover_letters add column if not exists updated_at timestamptz not null default now();

create index if not exists cover_letters_user_created_idx on public.cover_letters(user_id, created_at desc);
create index if not exists cover_letters_user_analysis_idx on public.cover_letters(user_id, analysis_id);

alter table public.cover_letters enable row level security;

drop policy if exists "Users can view own cover letters" on public.cover_letters;
create policy "Users can view own cover letters"
  on public.cover_letters for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own cover letters" on public.cover_letters;
create policy "Users can insert own cover letters"
  on public.cover_letters for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own cover letters" on public.cover_letters;
create policy "Users can update own cover letters"
  on public.cover_letters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own cover letters" on public.cover_letters;
create policy "Users can delete own cover letters"
  on public.cover_letters for delete
  using (auth.uid() = user_id);
