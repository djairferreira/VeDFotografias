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
-- Galeria pode existir sem cliente e ser atribuída depois.
alter table galleries alter column client_id drop not null;

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries(id) on delete cascade,
  filename text not null,
  original_key text not null,
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

-- ===== Galerias por link e álbuns de seleção (2026-11-11) =====
-- Versões menores têm caminho calculado pelo id da foto: sem colunas extras.
alter table photos drop column if exists preview_key;
alter table photos drop column if exists thumb_key;

-- kind: 'gallery' (entrega por link, estilo Pixieset) ou 'album' (cliente escolhe N fotos).
alter table galleries add column if not exists kind text not null default 'gallery';
alter table galleries add column if not exists slug text;
alter table galleries add column if not exists link_enabled boolean not null default false;
-- Visual da capa num único JSON: foco da foto, posição, fonte, cor e tamanho do título.
alter table galleries add column if not exists design jsonb not null default '{}';
alter table galleries add column if not exists select_limit int;
alter table galleries add column if not exists selection_submitted_at timestamptz;
alter table galleries add column if not exists selection_name text;
alter table galleries add column if not exists selection_note text;
alter table galleries add column if not exists selection_seen boolean not null default false;
-- Downloads por link público: um contador, não uma linha por download.
alter table galleries add column if not exists public_downloads int not null default 0;
do $$ begin
  alter table galleries add constraint galleries_kind_chk check (kind in ('gallery', 'album'));
exception when duplicate_object then null; end $$;
create unique index if not exists galleries_slug_key on galleries (slug);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references galleries(id) on delete cascade,
  name text not null,
  position smallint not null default 0
);
create index if not exists categories_gallery_idx on categories (gallery_id, position);

alter table photos add column if not exists category_id uuid references categories(id) on delete set null;
-- Escolha do álbum: 1 byte por foto em vez de uma tabela de seleção.
alter table photos add column if not exists selected boolean not null default false;
create index if not exists photos_selected_idx on photos (gallery_id) where selected;
