-- Banco de fotos: esquema completo. Pode rodar várias vezes (idempotente).
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  notes text,
  password_hash text not null,
  role text not null check (role in ('admin', 'client')),
  active boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_key on users (lower(email));

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  ip text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts (lower(email), created_at desc);

create table if not exists galleries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  event_date date,
  published boolean not null default true,
  expires_at date,
  cover_photo_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists galleries_client_idx on galleries (client_id);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries(id) on delete cascade,
  filename text not null,
  original_key text not null,
  preview_key text not null,
  thumb_key text not null,
  content_type text not null default 'image/jpeg',
  size_bytes bigint not null default 0,
  width int,
  height int,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists photos_gallery_idx on photos (gallery_id, position);

create table if not exists downloads (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  gallery_id uuid references galleries(id) on delete cascade,
  photo_id uuid references photos(id) on delete set null,
  kind text not null check (kind in ('photo', 'zip')),
  photo_count int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists downloads_gallery_idx on downloads (gallery_id);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  service text,
  event_date text,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
