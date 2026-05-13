-- P8A Soft-launch feedback system

create table if not exists public.feedback_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  feedback_type text not null default 'ux',
  rating integer check (rating between 1 and 5),
  message text not null,
  page_path text,
  page_url text,
  status text not null default 'new',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists feedback_items_created_idx
  on public.feedback_items (created_at desc);

create index if not exists feedback_items_type_status_idx
  on public.feedback_items (feedback_type, status, created_at desc);

alter table public.feedback_items enable row level security;

drop policy if exists "Anyone can submit soft launch feedback" on public.feedback_items;
create policy "Anyone can submit soft launch feedback"
  on public.feedback_items for insert
  with check (true);

drop policy if exists "Admins can view feedback" on public.feedback_items;
create policy "Admins can view feedback"
  on public.feedback_items for select
  using (
    exists (
      select 1
      from public.admin_users au
      where lower(au.email) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "Admins can update feedback" on public.feedback_items;
create policy "Admins can update feedback"
  on public.feedback_items for update
  using (
    exists (
      select 1
      from public.admin_users au
      where lower(au.email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users au
      where lower(au.email) = lower(auth.jwt() ->> 'email')
    )
  );
