-- Web readers can see released analytics. Operator credentials own the write path.
alter table public.trade_observations enable row level security;
alter table public.ingestion_runs enable row level security;
revoke all on public.trade_observations, public.ingestion_runs from anon, authenticated;
grant select, insert, update on public.trade_observations, public.ingestion_runs to service_role;

create table public.trade_reporters (
  code integer primary key,
  name text not null
);

create table public.trade_products (
  edition text not null,
  hs6 text not null check (hs6 ~ '^[0-9]{6}$'),
  description text not null,
  primary key (edition, hs6)
);

insert into public.trade_reporters values (699, 'India');
insert into public.trade_products values
  ('H6', '854142', 'Photovoltaic cells not assembled in modules or made up into panels');

create table public.comtrade_attempts (
  attempted_at timestamptz primary key
);

create function public.reserve_comtrade_attempt() returns boolean
language plpgsql set search_path = ''
as $$
declare
  attempted timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(8064127);
  attempted := pg_catalog.clock_timestamp();
  if exists (
    select 1 from public.comtrade_attempts
    where attempted_at > attempted - interval '1.1 seconds'
  ) or (
    select count(*) from public.comtrade_attempts
    where attempted_at > attempted - interval '24 hours'
  ) >= 250 then
    return false;
  end if;
  delete from public.comtrade_attempts where attempted_at <= attempted - interval '24 hours';
  insert into public.comtrade_attempts values (attempted);
  return true;
end;
$$;

revoke all on function public.reserve_comtrade_attempt() from public, anon, authenticated;
grant execute on function public.reserve_comtrade_attempt() to service_role;

create table public.comtrade_row_reservations (
  reserved_at timestamptz primary key,
  row_count integer not null check (row_count between 1 and 499)
);

create function public.reserve_comtrade_rows(requested integer) returns boolean
language plpgsql set search_path = ''
as $$
declare reserved timestamptz;
begin
  if requested = 0 then return true; end if;
  if requested is null or requested not between 1 and 499 then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(8064127);
  reserved := pg_catalog.clock_timestamp();
  delete from public.comtrade_row_reservations where reserved_at <= reserved - interval '24 hours';
  if (select coalesce(sum(row_count), 0) from public.comtrade_row_reservations) + requested > 50000
    or (select count(*) from public.trade_observations) + requested > 250000
    or pg_catalog.pg_database_size(pg_catalog.current_database()) > 350000000
  then return false; end if;
  insert into public.comtrade_row_reservations values (reserved, requested);
  return true;
end;
$$;

revoke all on function public.reserve_comtrade_rows(integer) from public, anon, authenticated;
grant execute on function public.reserve_comtrade_rows(integer) to service_role;

create table public.trade_snapshots (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  calculation_version text not null,
  published_at timestamptz,
  pilot_dashboard jsonb check (jsonb_typeof(pilot_dashboard) = 'object')
);

create table public.trade_snapshot_inputs (
  snapshot_id text primary key references public.trade_snapshots(id),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object')
);

create table public.trade_snapshot_pairs (
  snapshot_id text not null references public.trade_snapshots(id),
  reporter_code integer not null references public.trade_reporters(code),
  edition text not null,
  hs6 text not null,
  reference_year smallint not null,
  score numeric check (score between 0 and 100),
  score_components jsonb not null default '{}',
  quality jsonb not null default '{}',
  primary key (snapshot_id, reporter_code, edition, hs6),
  foreign key (edition, hs6) references public.trade_products(edition, hs6)
);

create table public.trade_snapshot_years (
  snapshot_id text not null,
  reporter_code integer not null,
  edition text not null,
  hs6 text not null,
  period smallint not null,
  import_value_usd numeric,
  import_growth_pct numeric,
  primary key (snapshot_id, reporter_code, edition, hs6, period),
  foreign key (snapshot_id, reporter_code, edition, hs6)
    references public.trade_snapshot_pairs(snapshot_id, reporter_code, edition, hs6)
);

create table public.trade_snapshot_suppliers (
  snapshot_id text not null,
  reporter_code integer not null,
  edition text not null,
  hs6 text not null,
  period smallint not null,
  partner_code integer not null,
  supplier_rank integer not null check (supplier_rank > 0),
  import_value_usd numeric not null,
  market_share_pct numeric,
  share_change_pp numeric,
  unit_value_usd_per_kg numeric,
  primary key (snapshot_id, reporter_code, edition, hs6, period, partner_code),
  foreign key (snapshot_id, reporter_code, edition, hs6, period)
    references public.trade_snapshot_years(snapshot_id, reporter_code, edition, hs6, period)
);

do $$
declare name text;
begin
  foreach name in array array[
    'trade_reporters', 'trade_products', 'comtrade_attempts', 'comtrade_row_reservations', 'trade_snapshots',
    'trade_snapshot_inputs', 'trade_snapshot_pairs', 'trade_snapshot_years', 'trade_snapshot_suppliers'
  ] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from anon, authenticated', name);
    execute format('grant select, insert, update, delete on public.%I to service_role', name);
  end loop;
end;
$$;

grant select on public.trade_snapshots to anon, authenticated;
create policy read_published_snapshots on public.trade_snapshots for select
to anon, authenticated using (published_at is not null);

create function public.publish_pilot_snapshot(
  snapshot_id text, version text, dashboard jsonb, inputs jsonb
) returns void
language plpgsql set search_path = ''
as $$
begin
  insert into public.trade_snapshots (id, calculation_version, published_at, pilot_dashboard)
  values (snapshot_id, version, now(), dashboard)
  on conflict (id) do nothing;

  insert into public.trade_snapshot_inputs (snapshot_id, evidence)
  values (snapshot_id, inputs)
  on conflict on constraint trade_snapshot_inputs_pkey do nothing;
end;
$$;

revoke all on function public.publish_pilot_snapshot(text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.publish_pilot_snapshot(text, text, jsonb, jsonb) to service_role;
