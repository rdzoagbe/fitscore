-- P6D - Public lead capture / early access form
-- Run in Supabase SQL Editor for the Joblytics project.

create table if not exists public.marketing_leads (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  target_role text,
  job_search_goal text,
  target_market text,
  notes text,
  source_page text,
  source_label text,
  marketing_opt_in boolean not null default true,
  user_agent text,
  status text not null default 'new',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists marketing_leads_email_unique_idx
  on public.marketing_leads (lower(email));

create index if not exists marketing_leads_created_idx
  on public.marketing_leads (created_at desc);

create index if not exists marketing_leads_source_idx
  on public.marketing_leads (source_label, created_at desc);

alter table public.marketing_leads enable row level security;

create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default now()
);

insert into public.admin_users (email)
values ('rolanddzoagbe@gmail.com')
on conflict (email) do nothing;

drop policy if exists "Anyone can join early access" on public.marketing_leads;
create policy "Anyone can join early access"
  on public.marketing_leads for insert
  to anon, authenticated
  with check (
    email is not null
    and length(email) between 5 and 320
    and position('@' in email) > 1
    and marketing_opt_in = true
  );

drop policy if exists "Anyone can update own email lead" on public.marketing_leads;
create policy "Anyone can update own email lead"
  on public.marketing_leads for update
  to anon, authenticated
  using (email is not null)
  with check (
    email is not null
    and length(email) between 5 and 320
    and position('@' in email) > 1
    and marketing_opt_in = true
  );

drop policy if exists "Admins can view marketing leads" on public.marketing_leads;
create policy "Admins can view marketing leads"
  on public.marketing_leads for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Admins can manage marketing leads" on public.marketing_leads;
create policy "Admins can manage marketing leads"
  on public.marketing_leads for update
  to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1 from public.admin_users au
      where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- QA queries:
-- select count(*) from public.marketing_leads;
-- select email, target_role, job_search_goal, target_market, source_page, created_at from public.marketing_leads order by created_at desc limit 20;
