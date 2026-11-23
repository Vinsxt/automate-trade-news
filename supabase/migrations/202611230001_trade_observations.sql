create extension if not exists pgcrypto;

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null check (status in ('RUNNING', 'SUCCEEDED', 'FAILED')),
  query jsonb not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_received integer not null default 0,
  records_written integer not null default 0,
  error_message text
);

create table if not exists public.trade_observations (
  id uuid primary key default gen_random_uuid(),
  observation_key text not null unique,
  ingestion_run_id uuid not null references public.ingestion_runs(id),
  source text not null,
  type_code text not null,
  frequency_code text not null,
  ref_period_id integer,
  period text not null,
  reporter_code integer not null,
  reporter_iso text,
  partner_code integer not null,
  partner_iso text,
  partner2_code integer not null,
  flow_code text not null,
  classification_code text not null,
  classification_search_code text not null,
  is_original_classification boolean not null,
  product_code text not null,
  customs_code text not null,
  mode_of_transport_code text not null,
  mode_of_transport integer not null,
  quantity_unit_code integer,
  quantity numeric,
  alt_quantity_unit_code integer,
  alt_quantity numeric,
  net_weight numeric,
  gross_weight numeric,
  cif_value numeric,
  fob_value numeric,
  primary_value numeric,
  legacy_estimation_flag integer,
  is_qty_estimated boolean,
  is_alt_qty_estimated boolean,
  is_net_wgt_estimated boolean,
  is_gross_wgt_estimated boolean,
  is_reported boolean not null,
  is_aggregate boolean not null,
  retrieved_at timestamptz not null default now(),
  source_payload jsonb not null
);

create index if not exists trade_observations_market_lookup_idx
  on public.trade_observations (reporter_code, product_code, period, flow_code);

create index if not exists trade_observations_partner_lookup_idx
  on public.trade_observations (partner_code, reporter_code, product_code, period);
