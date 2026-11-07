-- DJ-Rolle, Mikrofonaufnahmen, Radiosender mit Zeitplan, Titellänge.

alter table queue_items add column if not exists duration_ms integer not null default 0;
alter table playlist_tracks add column if not exists duration_ms integer not null default 0;

create table if not exists recordings (
  id serial primary key,
  title text not null,
  mime text not null default 'audio/webm',
  audio_base64 text not null,
  duration_ms integer not null,
  created_by text not null,
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

alter table announcements add column if not exists recording_id integer references recordings (id) on delete set null;

create table if not exists relay_stations (
  id serial primary key,
  name text not null,
  stream_url text not null,
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists relay_slots (
  id serial primary key,
  station_id integer not null references relay_stations (id) on delete cascade,
  title text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table playback add column if not exists relay_slot_id integer;
