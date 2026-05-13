-- Joblytics AI Phase 1 schema
-- Scope: auth-owned profile, CV versions, applications, ATS analyses, cover letters, interview sessions, feedback, usage events.

create extension if not exists pgcrypto;

create type public.plan_type as enum ('free', 'pro', 'team');
create type public.application_status as enum ('wishlist', 'applied', 'screening', 'interview_1', 'interview_2', 'technical_test', 'offer', 'accepted', 'rejected', 'withdrawn', 'no_response');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  plan public.plan_type not null default 'free',
  language text not null default 'fr' check (language in ('fr', 'en')),
  france_travail_id text,
  are_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_name text not null,
  parsed_text text,
  is_base boolean not null default false,
  target_role text,
  ats_score integer check (ats_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  job_title text not null,
  job_url text,
  job_description text,
  status public.application_status not null default 'wishlist',
  platform text,
  ats_score integer check (ats_score between 0 and 100),
  applied_at date,
  interview_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ats_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  cv_version_id uuid references public.cv_versions(id) on delete set null,
  result_json jsonb not null,
  overall_score integer generated always as ((result_json->>'overall_score')::integer) stored,
  created_at timestamptz not null default now()
);

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  language text not null default 'fr' check (language in ('fr', 'en')),
  content text not null,
  tone text not null default 'professional',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  questions_json jsonb not null default '[]'::jsonb,
  confidence_score integer check (confidence_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  page text,
  rating integer check (rating between 1 and 5),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.cv_versions enable row level security;
alter table public.applications enable row level security;
alter table public.ats_analyses enable row level security;
alter table public.cover_letters enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.usage_events enable row level security;
alter table public.feedback_items enable row level security;

create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);

create policy cv_versions_own_all on public.cv_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy applications_own_all on public.applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ats_analyses_own_all on public.ats_analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy cover_letters_own_all on public.cover_letters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy interview_sessions_own_all on public.interview_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy usage_events_own_all on public.usage_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy feedback_items_insert_own_or_public on public.feedback_items for insert with check (auth.uid() = user_id or user_id is null);
create policy feedback_items_select_own on public.feedback_items for select using (auth.uid() = user_id);

create index applications_user_status_idx on public.applications(user_id, status);
create index applications_user_created_idx on public.applications(user_id, created_at desc);
create index ats_analyses_user_created_idx on public.ats_analyses(user_id, created_at desc);
create index usage_events_user_created_idx on public.usage_events(user_id, created_at desc);
