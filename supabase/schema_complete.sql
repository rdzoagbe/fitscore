-- ============================================================
-- JOBLYTICS AI — COMPLETE SCHEMA (run once in Supabase SQL Editor)
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT
-- ============================================================

-- ── 1. Core analyses table (original) ───────────────────────
create table if not exists public.analyses (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  job_url        text not null,
  job_title      text,
  score          integer not null,
  result         jsonb not null,
  cv_file_path   text,
  cv_file_name   text,
  cache_key      text,
  created_at     timestamp with time zone default now()
);

create index if not exists analyses_user_created_idx
  on public.analyses (user_id, created_at desc);

create index if not exists analyses_user_cache_idx
  on public.analyses (user_id, cache_key);

alter table public.analyses enable row level security;

drop policy if exists "Users can view own analyses" on public.analyses;
create policy "Users can view own analyses"
  on public.analyses for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own analyses" on public.analyses;
create policy "Users can insert own analyses"
  on public.analyses for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own analyses" on public.analyses;
create policy "Users can update own analyses"
  on public.analyses for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own analyses" on public.analyses;
create policy "Users can delete own analyses"
  on public.analyses for delete using (auth.uid() = user_id);


-- ── 2. User profiles (billing + plan) ───────────────────────
create table if not exists public.user_profiles (
  id                      uuid default gen_random_uuid() primary key,
  user_id                 uuid references auth.users(id) on delete cascade unique not null,
  email                   text,
  plan                    text not null default 'free',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_status             text default 'free',
  plan_updated_at         timestamp with time zone,
  created_at              timestamp with time zone default now(),
  updated_at              timestamp with time zone default now()
);

create index if not exists user_profiles_user_id_idx
  on public.user_profiles (user_id);

create index if not exists user_profiles_stripe_customer_idx
  on public.user_profiles (stripe_customer_id);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile"
  on public.user_profiles for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
  on public.user_profiles for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = user_id);


-- ── 3. Usage events (rate limiting) ─────────────────────────
create table if not exists public.usage_events (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  action     text not null,
  status     text not null default 'success',
  metadata   jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists usage_events_user_action_idx
  on public.usage_events (user_id, action, created_at desc);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "Users can view own usage events" on public.usage_events;
create policy "Users can view own usage events"
  on public.usage_events for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage events" on public.usage_events;
create policy "Users can insert own usage events"
  on public.usage_events for insert with check (auth.uid() = user_id);


-- ── 4. CV versions vault ─────────────────────────────────────
create table if not exists public.cv_versions (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  label        text not null default 'My CV',
  file_name    text,
  file_path    text,
  cv_text      text,
  language     text default 'en',
  target_role  text,
  is_active    boolean default false,
  created_at   timestamp with time zone default now(),
  updated_at   timestamp with time zone default now()
);

create index if not exists cv_versions_user_created_idx
  on public.cv_versions (user_id, created_at desc);

alter table public.cv_versions enable row level security;

drop policy if exists "Users can manage own cv versions" on public.cv_versions;
create policy "Users can manage own cv versions"
  on public.cv_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── 5. Billing events ────────────────────────────────────────
create table if not exists public.billing_events (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete set null,
  stripe_event_id     text unique,
  event_type          text not null,
  stripe_customer_id  text,
  payload             jsonb default '{}'::jsonb,
  created_at          timestamp with time zone default now()
);

create index if not exists billing_events_user_created_idx
  on public.billing_events (user_id, created_at desc);

create index if not exists billing_events_type_created_idx
  on public.billing_events (event_type, created_at desc);

alter table public.billing_events enable row level security;


-- ── 6. Product error events (reliability) ───────────────────
create table if not exists public.product_error_events (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete set null,
  source       text not null default 'frontend',
  severity     text not null default 'error',
  page_path    text,
  message      text not null,
  stack        text,
  endpoint     text,
  status_code  integer,
  browser      jsonb default '{}'::jsonb,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamp with time zone default now()
);

create index if not exists product_error_events_created_idx
  on public.product_error_events (created_at desc);

alter table public.product_error_events enable row level security;

drop policy if exists "Users can insert own product error events" on public.product_error_events;
create policy "Users can insert own product error events"
  on public.product_error_events for insert
  with check (auth.uid() = user_id);


-- ── 7. Feedback items ────────────────────────────────────────
create table if not exists public.feedback_items (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete set null,
  email         text,
  feedback_type text not null default 'ux',
  rating        integer check (rating between 1 and 5),
  message       text not null,
  page_path     text,
  page_url      text,
  status        text not null default 'new',
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamp with time zone default now(),
  updated_at    timestamp with time zone default now()
);

create index if not exists feedback_items_created_idx
  on public.feedback_items (created_at desc);

alter table public.feedback_items enable row level security;

drop policy if exists "Anyone can submit soft launch feedback" on public.feedback_items;
create policy "Anyone can submit soft launch feedback"
  on public.feedback_items for insert with check (true);


-- ── 8. Admin users ───────────────────────────────────────────
create table if not exists public.admin_users (
  id         uuid default gen_random_uuid() primary key,
  email      text not null unique,
  created_at timestamp with time zone default now()
);

-- !! Replace with your actual admin email !!
insert into public.admin_users (email)
values ('rolanddzoagbe@gmail.com')
on conflict (email) do nothing;


-- ── 9. CV storage bucket ─────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict do nothing;

drop policy if exists "Users can upload own CVs" on storage.objects;
create policy "Users can upload own CVs"
  on storage.objects for insert
  with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can view own CVs" on storage.objects;
create policy "Users can view own CVs"
  on storage.objects for select
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own CVs" on storage.objects;
create policy "Users can delete own CVs"
  on storage.objects for delete
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own CVs" on storage.objects;
create policy "Users can update own CVs"
  on storage.objects for update
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);


-- ── 10. Smart Sync connections (Outlook / Gmail) ─────────────
create table if not exists public.job_sync_connections (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  provider            text not null,                      -- 'microsoft' | 'google'
  status              text not null default 'connected',  -- 'connected' | 'disconnected' | 'error'
  provider_email      text,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamp with time zone,
  scopes              text,
  last_error          text,
  last_synced_at      timestamp with time zone,
  created_at          timestamp with time zone default now(),
  updated_at          timestamp with time zone default now(),
  unique (user_id, provider)
);

create index if not exists job_sync_connections_user_idx
  on public.job_sync_connections (user_id);

alter table public.job_sync_connections enable row level security;

drop policy if exists "Users can view own sync connections" on public.job_sync_connections;
create policy "Users can view own sync connections"
  on public.job_sync_connections for select using (auth.uid() = user_id);

drop policy if exists "Users can manage own sync connections" on public.job_sync_connections;
create policy "Users can manage own sync connections"
  on public.job_sync_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
