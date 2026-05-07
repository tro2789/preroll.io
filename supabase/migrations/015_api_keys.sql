-- API key auth for external consumers (MCP server, scripts, etc.)
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique,
  name text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table api_keys enable row level security;

create policy "Users manage own API keys"
  on api_keys for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_api_keys_hash on api_keys(key_hash);
