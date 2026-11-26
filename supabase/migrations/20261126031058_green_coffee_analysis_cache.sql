create table public.ai_analyses (
  cache_key text primary key check (cache_key ~ '^[a-f0-9]{64}$'),
  hs_code text not null check (hs_code = '090111'),
  analysis_type text not null check (analysis_type = 'coffee_outlook'),
  data_hash text not null check (data_hash ~ '^[a-f0-9]{64}$'),
  prompt_version text not null,
  model text not null,
  source_snapshot text not null references public.trade_snapshots(id),
  period_start integer not null,
  period_end integer not null check (period_end = period_start + 3),
  response jsonb not null check ((
    jsonb_typeof(response) = 'object'
    and case when jsonb_typeof(response->'ids') = 'array' then jsonb_array_length(response->'ids') = 3 else false end
    and case when jsonb_typeof(response->'sections') = 'array' then jsonb_array_length(response->'sections') = 3 else false end
  ) is true),
  generated_at timestamptz not null default clock_timestamp(),
  unique (hs_code, analysis_type, data_hash, prompt_version, model)
);

create index ai_analyses_previous_idx on public.ai_analyses (hs_code, analysis_type, period_end desc, generated_at desc);
alter table public.ai_analyses enable row level security;
revoke all on public.ai_analyses from public, anon, authenticated;
grant select, insert on public.ai_analyses to service_role;

create function public.reserve_coffee_analysis(
  release_id text, provider_model text, generation text, analysis_key text,
  daily_cap integer, allow_generate boolean
) returns jsonb
language plpgsql set search_path = ''
as $$
declare
  attempt_id uuid;
begin
  -- Serialize the post-cache-check reservation with every other Gemini attempt.
  perform pg_catalog.pg_advisory_xact_lock(202611250001);
  if exists (select 1 from public.ai_analyses where cache_key = analysis_key) then
    return jsonb_build_object('state', 'ready');
  end if;
  if exists (
    select 1 from public.trade_explanation_attempts a
    where a.generation_version = generation and a.status = 'pending'
      and a.evidence_hashes @> array[analysis_key]
      and a.started_at > pg_catalog.clock_timestamp() - interval '90 seconds'
  ) then
    return jsonb_build_object('state', 'running');
  end if;
  if allow_generate is distinct from true then
    return jsonb_build_object('state', 'unavailable');
  end if;

  -- A terminated worker must not hold the key forever. The lease exceeds the web
  -- execution limit and Gemini's deadline, including at a Pacific day rollover.
  update public.trade_explanation_attempts a set status = 'provider_error'
    where a.generation_version = generation and a.status = 'pending'
      and a.evidence_hashes @> array[analysis_key]
      and a.started_at <= pg_catalog.clock_timestamp() - interval '90 seconds';
  attempt_id := public.reserve_trade_explanation_attempt(
    release_id, provider_model, generation, array[analysis_key], daily_cap
  );
  if attempt_id is null then
    return jsonb_build_object('state', 'unavailable');
  end if;
  return jsonb_build_object('state', 'reserved', 'attemptId', attempt_id);
end;
$$;

revoke all on function public.reserve_coffee_analysis(text,text,text,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.reserve_coffee_analysis(text,text,text,text,integer,boolean) to service_role;
