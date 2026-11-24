-- Run against a disposable database after applying both migrations.
begin;

insert into public.ingestion_runs (id, source, status, query)
values
  ('11111111-1111-1111-1111-111111111111', 'UN_COMTRADE', 'SUCCEEDED', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'UN_COMTRADE', 'SUCCEEDED', '{}');

set local role service_role;
do $$
declare run_id uuid;
begin
  foreach run_id in array array[
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid
  ] loop
    insert into public.trade_observations (
      observation_key, ingestion_run_id, source, type_code, frequency_code, period,
      reporter_code, partner_code, partner2_code, flow_code, classification_code,
      classification_search_code, is_original_classification, product_code, customs_code,
      mode_of_transport_code, mode_of_transport, is_reported, is_aggregate, source_payload
    ) values (
      'phase1-test-fixture', run_id, 'UN_COMTRADE', 'C', 'A', '2025',
      699, 0, 0, 'M', 'H6', 'HS', true, '854142', 'C00', '0', 0, false, true, '{}'
    ) on conflict (observation_key) do update
      set ingestion_run_id = excluded.ingestion_run_id;
  end loop;

  if (select count(*) from public.trade_observations where observation_key = 'phase1-test-fixture') <> 1
    or (select ingestion_run_id from public.trade_observations where observation_key = 'phase1-test-fixture') <> run_id
  then raise exception 'Repeated import did not preserve a unique observation'; end if;

  if not public.reserve_comtrade_attempt() or public.reserve_comtrade_attempt() then
    raise exception 'Attempt pacing was not enforced';
  end if;
  if not public.reserve_comtrade_rows(24) or public.reserve_comtrade_rows(500) then
    raise exception 'Row budget was not enforced';
  end if;

  perform public.publish_pilot_snapshot(repeat('a', 64), 'test', '{}', '{"private":true}');
  perform public.publish_pilot_snapshot(repeat('a', 64), 'test', '{}', '{"private":true}');
  insert into public.trade_snapshots (id, calculation_version) values (repeat('b', 64), 'test');

  if (select count(*) from public.trade_snapshot_inputs where snapshot_id = repeat('a', 64)) <> 1
  then raise exception 'Repeated publication duplicated evidence'; end if;
end;
$$;

set local role anon;
do $$
begin
  if (select count(*) from public.trade_snapshots where id in (repeat('a', 64), repeat('b', 64))) <> 1
  then raise exception 'Reader did not see exactly the published fixture'; end if;

  if has_table_privilege(current_user, 'public.trade_snapshot_inputs', 'SELECT')
    or has_table_privilege(current_user, 'public.trade_observations', 'SELECT')
    or has_table_privilege(current_user, 'public.trade_snapshots', 'INSERT')
    or has_function_privilege(current_user, 'public.reserve_comtrade_attempt()', 'EXECUTE')
    or has_function_privilege(current_user, 'public.publish_pilot_snapshot(text,text,jsonb,jsonb)', 'EXECUTE')
  then raise exception 'Reader has operator permissions'; end if;
end;
$$;

rollback;
