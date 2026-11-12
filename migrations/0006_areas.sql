-- Audiobereiche: benannte Geräte mit eigener Lautstärke.

create table if not exists audio_zones (
  id serial primary key,
  name text not null,
  volume integer not null default 42,
  created_at timestamptz not null default now()
);

create table if not exists audio_devices (
  id text primary key,
  name text not null default '',
  zone_id integer,
  user_id text not null default '',
  user_name text not null default '',
  room text not null default '',
  user_agent text not null default '',
  last_seen timestamptz not null default now(),
  hearing boolean not null default false,
  detail text not null default '',
  created_at timestamptz not null default now()
);
