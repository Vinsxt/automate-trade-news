create function public.read_trade_database_bytes() returns bigint
language sql stable set search_path = ''
as $$
  select pg_catalog.pg_database_size(pg_catalog.current_database())
$$;

revoke all on function public.read_trade_database_bytes() from public, anon, authenticated;
grant execute on function public.read_trade_database_bytes() to service_role;
