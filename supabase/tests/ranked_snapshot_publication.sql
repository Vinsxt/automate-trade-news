-- Run on a disposable database with all migrations applied.
begin;
set local role service_role;
select public.publish_ranked_snapshot(repeat('c', 64), '{"hs6":"090111"}', '{"36":{}}', '{"private":true}');
select public.publish_ranked_snapshot(repeat('c', 64), '{"hs6":"090111"}', '{"36":{}}', '{"private":true}');
insert into public.trade_snapshots (id, calculation_version, ranked_summary)
values (repeat('d', 64), 'opportunity-v1', '{"hs6":"090111"}');
insert into public.trade_ranked_details values (repeat('d', 64), 36, '{}');

do $$
begin
  begin
    perform public.publish_ranked_snapshot(repeat('e', 64), '{"hs6":"090111"}', '{"36":[]}', '{}');
    raise exception 'Invalid detail should fail';
  exception when check_violation then null;
  end;
  if exists (select from public.trade_snapshots where id = repeat('e', 64))
  then raise exception 'Failed publish left a snapshot'; end if;
end;
$$;

set local role anon;
do $$
begin
  if (select count(*) from public.trade_ranked_details where snapshot_id in (repeat('c', 64), repeat('d', 64))) <> 1
  then raise exception 'Reader did not see exactly the published detail'; end if;
  if has_table_privilege(current_user, 'public.trade_snapshot_inputs', 'SELECT')
    or has_function_privilege(current_user, 'public.publish_ranked_snapshot(text,jsonb,jsonb,jsonb)', 'EXECUTE')
  then raise exception 'Reader has operator permissions'; end if;
end;
$$;
rollback;
