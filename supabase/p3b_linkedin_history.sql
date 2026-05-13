-- P3B — LinkedIn optimization history
-- Run in Supabase SQL Editor after applying the code patch.

create table if not exists public.linkedin_optimizations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  target_role text,
  profile_input jsonb default '{}'::jsonb,
  result_json jsonb not null,
  score integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists linkedin_optimizations_user_created_idx
  on public.linkedin_optimizations (user_id, created_at desc);

create index if not exists linkedin_optimizations_score_idx
  on public.linkedin_optimizations (score desc);

alter table public.linkedin_optimizations enable row level security;

drop policy if exists "Users can view own LinkedIn optimizations" on public.linkedin_optimizations;
create policy "Users can view own LinkedIn optimizations"
  on public.linkedin_optimizations for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own LinkedIn optimizations" on public.linkedin_optimizations;
create policy "Users can insert own LinkedIn optimizations"
  on public.linkedin_optimizations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own LinkedIn optimizations" on public.linkedin_optimizations;
create policy "Users can update own LinkedIn optimizations"
  on public.linkedin_optimizations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own LinkedIn optimizations" on public.linkedin_optimizations;
create policy "Users can delete own LinkedIn optimizations"
  on public.linkedin_optimizations for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_linkedin_optimizations_updated_at on public.linkedin_optimizations;
create trigger set_linkedin_optimizations_updated_at
before update on public.linkedin_optimizations
for each row
execute function public.set_updated_at();
