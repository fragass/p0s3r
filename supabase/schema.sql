-- Extensões
create extension if not exists pgcrypto;

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- SESSIONS
create table if not exists public.sessions (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

-- ROOMS
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ROOM MEMBERS
create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists room_members_user_id_idx on public.room_members(user_id);

-- MESSAGES
create table if not exists public.messages (
  id bigserial primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_id_id_idx on public.messages(room_id, id desc);
create index if not exists messages_created_at_idx on public.messages(created_at desc);

-- PRESENCE
create table if not exists public.presence (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_seen timestamptz not null default now()
);

create index if not exists presence_last_seen_idx on public.presence(last_seen desc);

-- RLS off (simple server-role access)
alter table public.users disable row level security;
alter table public.sessions disable row level security;
alter table public.rooms disable row level security;
alter table public.room_members disable row level security;
alter table public.messages disable row level security;
alter table public.presence disable row level security;
