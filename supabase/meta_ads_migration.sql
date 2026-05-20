-- Ejecutar en Supabase → SQL Editor

create table if not exists meta_connections (
  id               uuid default gen_random_uuid() primary key,
  business_id      uuid references businesses(id) on delete cascade not null unique,
  access_token     text not null,
  ad_account_id    text,
  meta_user_id     text,
  token_expires_at timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table meta_connections enable row level security;

create policy "Owners manage own meta connection"
  on meta_connections
  for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
