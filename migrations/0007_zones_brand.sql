-- Musikplan und Kalender pro Audiobereich. Leere zone_id gilt fürs ganze Haus.
-- Markenfelder leer lassen heißt: die Werte aus der mitgelieferten CI.

alter table plan_blocks add column if not exists zone_id integer;
alter table calendar_rules add column if not exists zone_id integer;

alter table station_settings add column if not exists brand_company text not null default '';
alter table station_settings add column if not exists brand_product text not null default '';
alter table station_settings add column if not exists brand_tagline text not null default '';
alter table station_settings add column if not exists brand_signal text not null default '';

create index if not exists plan_blocks_zone_idx on plan_blocks (zone_id, starts_at);
create index if not exists calendar_rules_zone_idx on calendar_rules (zone_id, starts_at);
