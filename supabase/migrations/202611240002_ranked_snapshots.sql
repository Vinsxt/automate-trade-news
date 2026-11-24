alter table public.trade_snapshots add column ranked_summary jsonb;
create index trade_snapshots_ranked_product_idx
  on public.trade_snapshots ((ranked_summary->>'hs6'), published_at desc, id)
  where ranked_summary is not null and published_at is not null;

create table public.trade_ranked_details (
  snapshot_id text not null references public.trade_snapshots(id),
  reporter_code integer not null,
  dashboard jsonb not null check (jsonb_typeof(dashboard) = 'object'),
  primary key (snapshot_id, reporter_code)
);
alter table public.trade_ranked_details enable row level security;
revoke all on public.trade_ranked_details from anon, authenticated;
grant select on public.trade_ranked_details to anon, authenticated;
grant select, insert on public.trade_ranked_details to service_role;
create policy read_released_ranked_details on public.trade_ranked_details
  for select to anon, authenticated using (exists (
    select 1 from public.trade_snapshots as snapshot
    where snapshot.id = snapshot_id and snapshot.published_at is not null
  ));

create function public.publish_ranked_snapshot(
  release_id text, summary jsonb, details jsonb, inputs jsonb
) returns void
language plpgsql set search_path = ''
as $$
begin
  insert into public.trade_snapshots (id, calculation_version, ranked_summary)
  values (release_id, 'opportunity-v1', summary)
  on conflict (id) do nothing;
  if not found then return; end if;

  insert into public.trade_snapshot_inputs (snapshot_id, evidence) values (release_id, inputs);
  insert into public.trade_ranked_details (snapshot_id, reporter_code, dashboard)
  select release_id, key::integer, value from pg_catalog.jsonb_each(details);
  update public.trade_snapshots set published_at = now() where id = release_id;
end;
$$;
revoke all on function public.publish_ranked_snapshot(text,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.publish_ranked_snapshot(text,jsonb,jsonb,jsonb) to service_role;
