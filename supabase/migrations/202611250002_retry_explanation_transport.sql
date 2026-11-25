create or replace function public.reserve_trade_explanation_attempt(
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
      where quota_day = day_pacific and evidence_hashes && hashes and status <> 'provider_error') or
    exists (
      select hash from public.trade_explanation_attempts as attempt
      cross join lateral unnest(attempt.evidence_hashes) as evidence(hash)
      where attempt.quota_day = day_pacific and attempt.status = 'provider_error'
        and hash = any(hashes)
      group by hash having count(*) >= 2
    )
  then return null;
  end if;
  insert into public.trade_explanation_attempts(snapshot_id, model, generation_version, evidence_hashes, quota_day)
    values (release_id, provider_model, generation, hashes, day_pacific)
    returning id into attempt_id;
  return attempt_id;
end;
$$;
