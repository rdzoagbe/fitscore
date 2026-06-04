-- job_sync_events: stores email and calendar signals detected by Smart Sync
-- Run this in Supabase → SQL Editor if the table does not yet exist.

create table if not exists public.job_sync_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  provider         text not null,          -- 'google' | 'microsoft'
  source           text not null,          -- 'email' | 'calendar'
  external_id      text not null,          -- provider message/event id
  event_type       text not null default 'application_signal',
  detected_status  text,
  status_label     text,
  company          text,
  role_title       text,
  platform         text,
  subject          text,
  sender           text,
  event_date       timestamptz,
  location         text,
  snippet          text,
  confidence       numeric(4,3),
  confidence_label text,
  raw              jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, provider, source, external_id)
);

create index if not exists job_sync_events_user_date_idx on public.job_sync_events (user_id, event_date desc);
create index if not exists job_sync_events_company_idx   on public.job_sync_events (user_id, company);

alter table public.job_sync_events enable row level security;

drop policy if exists "Users can read own sync events" on public.job_sync_events;
create policy "Users can read own sync events"
  on public.job_sync_events for select
  using (auth.uid() = user_id);

-- Inserts and upserts are performed server-side using the Supabase service role key.
