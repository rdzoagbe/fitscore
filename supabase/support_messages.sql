-- Joblytics support conversation and contact anti-abuse tables
-- Run this once in Supabase SQL Editor before using /contact and /messages.

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

create index if not exists support_threads_user_id_idx on public.support_threads(user_id);
create index if not exists support_threads_last_message_at_idx on public.support_threads(last_message_at desc);
create index if not exists support_messages_thread_id_idx on public.support_messages(thread_id, created_at asc);
create index if not exists contact_events_user_id_created_at_idx on public.contact_events(user_id, created_at desc);
create index if not exists contact_events_email_hash_created_at_idx on public.contact_events(email_hash, created_at desc);
create index if not exists contact_events_ip_hash_created_at_idx on public.contact_events(ip_hash, created_at desc);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
alter table public.contact_events enable row level security;

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

-- contact_events is write/read through the server service role only.
-- No public SELECT policy is intentionally created for anti-abuse metadata.

-- Inserts are performed by the server using a Supabase service role key.
-- Admin reply tooling can be added later through a protected admin dashboard or Supabase console.
