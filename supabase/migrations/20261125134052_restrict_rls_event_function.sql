-- Leave Supabase's automatic RLS event trigger enabled without public execute grants.
do $$
begin
  if exists (
    select from pg_catalog.pg_proc
    where oid = pg_catalog.to_regprocedure('public.rls_auto_enable()')
      and prorettype = 'pg_catalog.event_trigger'::regtype
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
