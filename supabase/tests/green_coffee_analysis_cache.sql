begin;
set local role service_role;
select public.publish_ranked_snapshot(repeat('a', 64), '{"hs6":"090111"}', '{"36":{}}', '{}');
do $$
declare
  reservation jsonb;
  original_time timestamptz;
  other_key text := repeat('d', 64);
  cache_key text := repeat('b', 64);
begin
  reservation := public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v1', cache_key, 20, true);
  if reservation->>'state' <> 'reserved' then raise exception 'Expected generation reservation'; end if;

  if public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v1', cache_key, 20, true)->>'state' <> 'running'
  then raise exception 'An in-flight request must own its cache key'; end if;

  update public.trade_explanation_attempts set quota_day = quota_day - 1 where id = (reservation->>'attemptId')::uuid;
  if public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v1', cache_key, 20, true)->>'state' <> 'running'
  then raise exception 'An in-flight request must survive quota-day rollover'; end if;
  update public.trade_explanation_attempts set quota_day = quota_day + 1 where id = (reservation->>'attemptId')::uuid;

  insert into public.ai_analyses
    (cache_key, hs_code, analysis_type, data_hash, prompt_version, model, source_snapshot, period_start, period_end, response)
  values (repeat('b', 64), '090111', 'coffee_outlook', repeat('c', 64), 'coffee-v1', 'fixture', repeat('a', 64), 2022, 2025,
    '{"ids":["direction-0","potential-1","risk-value"],"sections":["One","Two","Three"]}')
  returning generated_at into original_time;

  if public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v1', cache_key, 1, true)->>'state' <> 'ready'
  then raise exception 'Cache hits must work before quota or pending checks'; end if;
  if (select generated_at from public.ai_analyses a where a.cache_key = repeat('b', 64)) <> original_time
  then raise exception 'Serving a cache hit must preserve its generation date'; end if;

  if public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v1', other_key, 1, true)->>'state' <> 'unavailable'
  then raise exception 'Cache misses must obey the shared cap'; end if;
  if public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v2', other_key, 20, false)->>'state' <> 'unavailable'
  then raise exception 'Read-only requests must not start a generation'; end if;

  reservation := public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v2', other_key, 20, true);
  update public.trade_explanation_attempts set started_at = clock_timestamp() - interval '91 seconds'
    where id = (reservation->>'attemptId')::uuid;
  if public.reserve_coffee_analysis(repeat('a', 64), 'fixture', 'coffee-v2', other_key, 20, true)->>'state' <> 'reserved'
  then raise exception 'A terminated worker must not lock the key forever'; end if;
end;
$$;
set local role anon;
do $$
begin
  if has_table_privilege(current_user, 'public.ai_analyses', 'SELECT')
    or has_function_privilege(current_user, 'public.reserve_coffee_analysis(text,text,text,text,integer,boolean)', 'EXECUTE')
  then raise exception 'Anonymous readers must not access the private cache or reservations'; end if;
end;
$$;
rollback;
