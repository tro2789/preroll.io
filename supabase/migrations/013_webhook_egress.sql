-- Webhook egress: endpoints + delivery log

create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  secret_enc text not null,
  events text[] not null default '{}',
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table webhook_endpoints enable row level security;

create policy "Users manage own webhook endpoints"
  on webhook_endpoints for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status_code int,
  response_body text,
  error text,
  created_at timestamptz not null default now()
);

alter table webhook_deliveries enable row level security;

create policy "Users view own webhook deliveries"
  on webhook_deliveries for select
  using (
    endpoint_id in (
      select id from webhook_endpoints where user_id = auth.uid()
    )
  );

create index idx_webhook_endpoints_user on webhook_endpoints(user_id) where is_active = true;
create index idx_webhook_deliveries_endpoint on webhook_deliveries(endpoint_id);
create index idx_webhook_deliveries_created on webhook_deliveries(created_at);
