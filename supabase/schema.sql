-- Extensions
create extension if not exists pgcrypto;

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- SESSIONS (Bearer token)
create table if not exists public.sessions (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

-- PUBLIC MESSAGES (chat geral)
create table if not exists public.messages (
  id bigserial primary key,
  name text not null,
  content text,
  image_url text,
  "to" text,                -- para sussurro (opcional)
  reply_to bigint,          -- opcional
  reply_preview text,       -- opcional
  created_at timestamptz not null default now()
);
create index if not exists messages_created_at_idx on public.messages(created_at desc);

-- ONLINE USERS (presença simples)
create table if not exists public.online_users (
  name text primary key,
  last_seen timestamptz not null default now()
);
create index if not exists online_users_last_seen_idx on public.online_users(last_seen desc);

-- PRIVATE CHANNELS (DM rooms)
create table if not exists public.private_channels (
  id uuid primary key default gen_random_uuid(),
  room text not null unique,
  user1 text not null,
  user2 text not null,
  created_at timestamptz not null default now()
);

-- Unique constraint for pair (order-insensitive via generated key)
alter table public.private_channels
  add column if not exists pair_key text generated always as (
    case
      when user1 < user2 then user1 || ':' || user2
      else user2 || ':' || user1
    end
  ) stored;

create unique index if not exists unique_channel_pair on public.private_channels(pair_key);

-- PRIVATE MESSAGES (DM feed)
create table if not exists public.private_messages (
  id bigserial primary key,
  room text not null references public.private_channels(room) on delete cascade,
  name text not null,
  content text,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists private_messages_room_id_idx on public.private_messages(room, id desc);

-- (Opcional) Desliga RLS pra manter simples com service role no backend
alter table public.users disable row level security;
alter table public.sessions disable row level security;
alter table public.messages disable row level security;
alter table public.online_users disable row level security;
alter table public.private_channels disable row level security;
alter table public.private_messages disable row level security;

-- Storage: crie um bucket "uploads" no painel do Supabase Storage (público ou privado).
