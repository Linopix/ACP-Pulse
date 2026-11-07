-- Aufräumen schwacher Wünsche, wenn die Queue voll wird.

alter table station_settings add column if not exists wish_prune text not null default 'auto';
alter table station_settings add column if not exists wish_prune_at integer not null default 8;
