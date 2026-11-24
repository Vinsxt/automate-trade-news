# India solar import pilot

The Phase 1 dashboard reads published results from Supabase. The operator uses
the commands below to load data and publish a snapshot. The ranking catalog
and additional indicators follow the [target architecture](architecture.md).

The first runnable workflow tracks India (reporter 699) imports of HS 854142
(photovoltaic cells not assembled in modules or panels) from partner markets.
The dashboard uses annual UN Comtrade HS 2022 (H6) primary trade values and shows supplier
shares against the source's world-total partner row. Supplier share changes are
percentage-point differences between consecutive years.

## Local setup

1. Apply the versioned SQL files in `supabase/migrations/` to a development
   Supabase database. A migration is a database change stored in Git so each
   environment can apply the same schema and access rules in order.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for
   the Next.js app. Load `SUPABASE_SERVICE_ROLE_KEY` and the registered
   `COMTRADE_API_KEY` into the operator command environment only.
3. Run the operator commands and start the dashboard.

```bash
npm run ingest:trade -- 699 854142 2025
npm run publish:pilot
npm run dev
```

Run ingestion once per reporter, HS6 product and year. One operator process
should run at a time. Repeating a slice updates observations by their source
key, while each run gets its own log entry. The command rejects capped slices,
retries transient failures up to three total attempts, and enforces rolling
24-hour call and row budgets. Record counts and database size checks are
conservative and include room for existing data.

Row Level Security (RLS) is a PostgreSQL rule that decides which rows a role
can read or write. Here the app's anonymous role can read published snapshot
rows only. Source inputs, run logs, and publication operations use the
operator role. The pilot website becomes usable once a snapshot is published.

## Checks

Run `npm test`, `npm run typecheck`, and `npm run lint`. Apply the SQL test
`supabase/tests/trade_snapshot_foundation.sql` to a disposable Supabase
database after both migrations. It verifies repeat ingestion upserts,
publication idempotence, budget pacing, and reader permissions.

## Recompute a local snapshot

With the pilot Supabase settings loaded, choose a new path in a private directory
outside the repository.

```bash
npm run snapshot:pilot -- /path/to/private/india-solar-snapshot.json
```

The command reads the existing India HS 854142 observations and precomputes the
same totals, shares, ranks and movements as the dashboard. The file includes the
exact metric inputs and their ingestion-run references, so keep it private. The
snapshot ID stays the same for identical inputs and calculations.

## Interpretation limits

- Missing values and absent partner rows are not treated as zero.
- Year-over-year and share-change comparisons require consecutive years.
- Movement flags use absolute thresholds of 20% for total import value and five
  percentage points for supplier share. The thresholds are defined in the analytics module.
- Trade value is a value measure, not physical volume or evidence of causation.
- Partner names use a small pilot mapping when the source response omits names;
  otherwise the dashboard shows the partner code.
- Ingestion uses the registered API. A completed empty slice is distinct from a
  failed or throttled request.
- The current reader serves precomputed pilot metrics. Cached explanations
  are planned for Phase 4.
- The pilot snapshot includes supplier unit values in USD per kilogram and
  Indonesia’s gap against each comparable supplier. Missing or estimated weights
  leave the comparison unavailable. The pilot is a single destination, so a
  ranked shortlist requires a separate multi-market cohort.

## Publish a ranked cohort

The home page and `/rankings` show published rankings. The India solar pilot
is at `/pilot`. The ranking and drill-down are App Router Server Components.
They read summaries on the server and send rendered UI to the browser. Recharts
stays in a client component so the import trend can respond to user interaction.

After applying the ranked-snapshot migration, ingest all ten candidate markets
for one product with `npm run ingest:trade -- <reporter> <HS6> <year>` for each
year from 2022 through 2025. The [research manifest](research.md#candidate-pool-and-opportunity-score)
lists valid combinations. A completed empty slice can be screened as unranked.
A failed or missing slice blocks publication.

```bash
npm run publish:ranked -- 090111
```

The publisher writes the ranking and drill-down together. Links pin the
snapshot ID so a newer publication cannot change the evidence mid-review.
Run `supabase/tests/ranked_snapshot_publication.sql` against a disposable
database to verify that readers see published details only and that a failed
publication exposes no partial results.
