-- ACP Pulse: gemeinsame Sendung, Wünsche, Programmregeln.

create table if not exists members (
  user_id text primary key,
  display_name text not null,
  role text not null default 'listener',
  created_at timestamptz not null default now()
);

create table if not exists station_settings (
  id integer primary key default 1,
  wishes_enabled boolean not null default true,
  explicit_filter text not null default 'clean',
  volume integer not null default 42,
  output_target text not null default 'browser',
  sonos_room text not null default '',
  sonos_host text not null default '',
  receiver_url text not null default '',
  downvote_kick integer not null default 3,
  extra_blocklist text not null default '',
  music_source text not null default 'preview',
  spotify_client_id text not null default '',
  moderator_enabled boolean not null default false,
  moderator_slots text not null default '09:00,12:30,16:00',
  moderator_topics text not null default 'firma,tech',
  company_notes text not null default '',
  monitor_external boolean not null default false,
  constraint station_settings_singleton check (id = 1)
);

insert into station_settings (id) values (1) on conflict do nothing;

create table if not exists playlists (
  id serial primary key,
  name text not null,
  is_fallback boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists playlist_tracks (
  id serial primary key,
  playlist_id integer not null references playlists (id) on delete cascade,
  title text not null,
  artist text not null,
  album text not null default '',
  artwork_url text not null default '',
  preview_url text not null default '',
  source text not null default 'preview',
  external_id text not null default '',
  explicit boolean not null default false,
  position integer not null default 0
);

create table if not exists queue_items (
  id serial primary key,
  title text not null,
  artist text not null,
  album text not null default '',
  artwork_url text not null default '',
  preview_url text not null default '',
  source text not null default 'preview',
  external_id text not null default '',
  explicit boolean not null default false,
  added_by text not null,
  added_by_name text not null default '',
  status text not null default 'queued',
  score integer not null default 0,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  created_at timestamptz not null default now(),
  played_at timestamptz
);

create index if not exists queue_items_status_idx on queue_items (status);

create table if not exists votes (
  id serial primary key,
  queue_item_id integer not null references queue_items (id) on delete cascade,
  user_id text not null,
  value integer not null,
  created_at timestamptz not null default now(),
  unique (queue_item_id, user_id)
);

create index if not exists votes_user_idx on votes (user_id);

create table if not exists calendar_rules (
  id serial primary key,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  volume integer,
  wishes_enabled boolean,
  explicit_filter text,
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id serial primary key,
  kind text not null default 'manual',
  title text not null,
  body text not null,
  status text not null default 'queued',
  air_at timestamptz,
  created_by text not null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  played_at timestamptz
);

create table if not exists playback (
  id integer primary key default 1,
  mode text not null default 'idle',
  queue_item_id integer,
  playlist_track_id integer,
  announcement_id integer,
  started_at timestamptz,
  duration_ms integer not null default 30000,
  fallback_cursor integer not null default 0,
  dispatch_key text not null default '',
  constraint playback_singleton check (id = 1)
);

insert into playback (id) values (1) on conflict do nothing;
