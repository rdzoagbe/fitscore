create table if not exists public.product_error_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'frontend',
  severity text not null default 'error',
  page_path text,
  message text not null,
  stack text,
  endpoint text,
  status_code integer,
  browser jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists product_error_events_created_idx
  on public.product_error_events (created_at desc);

create index if not exists product_error_events_source_created_idx
  on public.product_error_events (source, created_at desc);

create index if not exists product_error_events_endpoint_created_idx
  on public.product_error_events (endpoint, created_at desc);

alter table public.product_error_events enable row level security;

-- Client writes go through the server endpoint with the service role.
-- Admin reads also go through /api/admin/reliability.
-- RLS stays restrictive by default.

drop policy if exists "Users can insert own product error events" on public.product_error_events;
create policy "Users can insert own product error events"
  on public.product_error_events for insert
  with check (auth.uid() = user_id);

-- Ensure admin table exists for compatibility with P5D.
create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default now()
);

insert into public.admin_users (email)
values ('rolanddzoagbe@gmail.com')
on conflict (email) do nothing;
