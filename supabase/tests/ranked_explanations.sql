begin;
set local role service_role;
select public.publish_ranked_snapshot(repeat('4', 64), '{"hs6":"090111"}', '{"36":{}}', '{}');
insert into public.trade_snapshots (id, calculation_version) values (repeat('5', 64), 'fixture');
insert into public.trade_ranked_details values (repeat('5', 64), 36, '{}');
insert into public.trade_ranked_explanations values
  (repeat('4', 64), 36, repeat('6', 64), array['size']),
  (repeat('5', 64), 36, repeat('6', 64), array['growth']);
do $$
declare
  reserved uuid;
begin
  reserved := public.reserve_trade_explanation_attempt(repeat('4', 64), 'fixture', 'v1', array[repeat('6', 64)], 20);
  if reserved is null then raise exception 'Expected a quota reservation'; end if;
  update public.trade_explanation_attempts set status = 'provider_error' where id = reserved;
  if public.reserve_trade_explanation_attempt(repeat('4', 64), 'fixture', 'v1', array[repeat('7', 64)], 1) is not null
  then raise exception 'Failed requests must count against the daily cap'; end if;
end;
$$;
set local role anon;
do $$
begin
  if (select count(*) from public.trade_ranked_explanations where snapshot_id in (repeat('4', 64), repeat('5', 64))) <> 1
  then raise exception 'Reader did not see exactly the published explanation'; end if;
  if has_table_privilege(current_user, 'public.trade_explanation_attempts', 'SELECT')
    or has_table_privilege(current_user, 'public.trade_ranked_explanations', 'INSERT')
    or has_function_privilege(current_user, 'public.reserve_trade_explanation_attempt(text,text,text,text[],integer)', 'EXECUTE')
  then raise exception 'Reader has operator permissions'; end if;
end;
$$;
rollback;
