-- Dienste (YouTube, Spotify, Microsoft 365, Piper), Nutzerstatus, Musikplan.

alter table members add column if not exists disabled boolean not null default false;

alter table announcements add column if not exists voice text not null default '';

create table if not exists service_links (
  id text primary key,
  enabled boolean not null default false,
  detail text not null default '',
  config text not null default '{}',
  secret text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists plan_blocks (
  id serial primary key,
  title text not null,
  kind text not null default 'musik',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  volume integer,
  wishes_enabled boolean,
  explicit_filter text,
  energy text not null default 'mittel',
  wish_note text not null default '',
  mood text not null default '',
  dj_brief text not null default '',
  talk_points text not null default '',
  station_id integer,
  source text not null default 'manual',
  external_id text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists plan_blocks_window_idx on plan_blocks (starts_at, ends_at);
