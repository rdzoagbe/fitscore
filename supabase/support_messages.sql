-- Joblytics support conversation, contact anti-abuse, and smart job tracking tables
-- Run this once in Supabase SQL Editor before using /contact, /messages, and Smart Tracking.

create extension if not exists pgcrypto;

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  category text not null default 'Support',
  subject text not null default 'Contact request',
  status text not null default 'open' check (status in ('open', 'pending', 'answered', 'closed')),
  last_message_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  sender_role text not null default 'user' check (sender_role in ('user', 'admin', 'system')),
  sender_email text,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email_hash text,
  ip_hash text,
  user_agent_hash text,
  category text not null default 'Support',
  success boolean not null default false,
  provider_id text,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_sync_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  provider_email text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected', 'revoked', 'error')),
  last_sync_at timestamptz,
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

create table if not exists public.job_tracking_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  source text not null check (source in ('gmail', 'calendar', 'manual', 'system')),
  provider_event_id text,
  event_type text not null,
  detected_status text check (detected_status in ('applied', 'interview', 'offer', 'rejected', 'withdrawn')),
  confidence numeric(4,3) default 0,
  subject text,
  sender_or_attendees text,
  event_at timestamptz,
  snippet text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, source, provider_event_id, analysis_id, event_type)
);

create index if not exists support_threads_user_id_idx on public.support_threads(user_id);
create index if not exists support_threads_last_message_at_idx on public.support_threads(last_message_at desc);
create index if not exists support_messages_thread_id_idx on public.support_messages(thread_id, created_at asc);
create index if not exists contact_events_user_id_created_at_idx on public.contact_events(user_id, created_at desc);
create index if not exists contact_events_email_hash_created_at_idx on public.contact_events(email_hash, created_at desc);
create index if not exists contact_events_ip_hash_created_at_idx on public.contact_events(ip_hash, created_at desc);
create index if not exists job_sync_connections_user_provider_idx on public.job_sync_connections(user_id, provider);
create index if not exists job_tracking_events_user_analysis_idx on public.job_tracking_events(user_id, analysis_id, event_at desc);
create index if not exists job_tracking_events_type_idx on public.job_tracking_events(event_type, event_at desc);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
alter table public.contact_events enable row level security;
alter table public.job_sync_connections enable row level security;
alter table public.job_tracking_events enable row level security;

drop policy if exists "Users can read own support threads" on public.support_threads;
create policy "Users can read own support threads"
  on public.support_threads
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own support messages" on public.support_messages;
create policy "Users can read own support messages"
  on public.support_messages
  for select
  using (
    exists (
      select 1 from public.support_threads t
      where t.id = support_messages.thread_id
      and t.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read own sync connection status" on public.job_sync_connections;
create policy "Users can read own sync connection status"
  on public.job_sync_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own job tracking events" on public.job_tracking_events;
create policy "Users can read own job tracking events"
  on public.job_tracking_events
  for select
  using (auth.uid() = user_id);

-- contact_events, job_sync_connections token writes, and job_tracking_events inserts/updates are performed by the server using a Supabase service role key.
-- No public SELECT policy is intentionally created for contact_events anti-abuse metadata.
-- Admin tooling can be added later through a protected admin dashboard or Supabase console.