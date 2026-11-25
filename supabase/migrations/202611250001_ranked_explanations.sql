create table public.trade_ranked_explanations (
  snapshot_id text not null,
  reporter_code integer not null,
  evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'),
  findings text[] not null check (cardinality(findings) between 1 and 3),
  primary key (snapshot_id, reporter_code, evidence_hash),
  foreign key (snapshot_id, reporter_code)
    references public.trade_ranked_details(snapshot_id, reporter_code)
);
create index trade_ranked_explanations_hash_idx on public.trade_ranked_explanations(evidence_hash);
alter table public.trade_ranked_explanations enable row level security;
revoke all on public.trade_ranked_explanations from anon, authenticated;
grant select on public.trade_ranked_explanations to anon, authenticated;
grant select, insert, update on public.trade_ranked_explanations to service_role;
create policy read_published_ranked_explanations on public.trade_ranked_explanations
  for select to anon, authenticated using (exists (
    select 1 from public.trade_snapshots s
    where s.id = snapshot_id and s.published_at is not null
  ));

create table public.trade_explanation_attempts (
  id uuid primary key default gen_random_uuid(),
  snapshot_id text not null references public.trade_snapshots(id),
  model text not null,
  generation_version text not null,
  evidence_hashes text[] not null check (cardinality(evidence_hashes) between 1 and 10),
  quota_day date not null,
  started_at timestamptz not null default clock_timestamp(),
  status text not null default 'pending' check (status in ('pending', 'passed', 'invalid', 'provider_error'))
);
create index trade_explanation_attempts_day_idx on public.trade_explanation_attempts(quota_day);
alter table public.trade_explanation_attempts enable row level security;
revoke all on public.trade_explanation_attempts from anon, authenticated;
grant select, insert, update on public.trade_explanation_attempts to service_role;

create function public.reserve_trade_explanation_attempt(
  release_id text, provider_model text, generation text, hashes text[], daily_cap integer
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  day_pacific date;
  attempt_id uuid;
begin
  -- Serialize the budget across concurrent operators, even when a request fails.
  perform pg_catalog.pg_advisory_xact_lock(202611250001);
  day_pacific := (pg_catalog.clock_timestamp() at time zone 'America/Los_Angeles')::date;
  if daily_cap is null or daily_cap not between 1 and 20 or
    (select count(*) from public.trade_explanation_attempts where quota_day = day_pacific) >= daily_cap or
    exists (select from public.trade_explanation_attempts
      where quota_day = day_pacific and evidence_hashes && hashes)
  then return null;
  end if;
  insert into public.trade_explanation_attempts(snapshot_id, model, generation_version, evidence_hashes, quota_day)
    values (release_id, provider_model, generation, hashes, day_pacific)
    returning id into attempt_id;
  return attempt_id;
end;
$$;
revoke all on function public.reserve_trade_explanation_attempt(text,text,text,text[],integer) from public, anon, authenticated;
grant execute on function public.reserve_trade_explanation_attempt(text,text,text,text[],integer) to service_role;
