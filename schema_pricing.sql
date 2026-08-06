-- Nikkel pricing — subscriptions table. Run once (separate from schema.sql full reset).
-- Deliberately adds NO triggers and NO enforcement: apply schema_pricing_gating.sql only when
-- pricing launches. During the free-for-all phase this table just sits empty.

create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  provider text check (provider in ('paddle', 'lemonsqueezy', 'stripe')),
  provider_customer_id text,
  provider_subscription_id text,
  subscription_status text check (subscription_status in ('active', 'trialing', 'past_due', 'paused', 'cancelled', 'expired')),
  current_period_end timestamptz,
  seats integer not null default 1 check (seats >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Owner-only read. Writes happen only via the service-role key from the webhook handler.
create policy "owner_can_view_subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- After applying: NOTIFY pgrst, 'reload schema';
