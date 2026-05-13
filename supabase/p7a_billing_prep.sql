alter table public.user_profiles
  add column if not exists email text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_status text default 'free',
  add column if not exists plan_updated_at timestamp with time zone;

create index if not exists user_profiles_stripe_customer_idx
  on public.user_profiles (stripe_customer_id);

create table if not exists public.billing_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  stripe_event_id text unique,
  event_type text not null,
  stripe_customer_id text,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists billing_events_user_created_idx
  on public.billing_events (user_id, created_at desc);

create index if not exists billing_events_type_created_idx
  on public.billing_events (event_type, created_at desc);

alter table public.billing_events enable row level security;

-- Admin/server access should use the Supabase service role key.
-- No client-side user policy is added here to avoid exposing billing event details to regular users.
