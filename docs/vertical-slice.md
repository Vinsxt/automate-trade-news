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

The home page lists supported products, and `/rankings` shows scores for all
screened markets of a selected product. The India solar pilot
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

### Backfill the remaining catalog

Apply the storage-measurement migration before running `npm run backfill:ranked`.
It groups missing products by reporter and year for the registered Comtrade API.
Each completed slice still has its own ingestion run. If a grouped response hits
its row limit, the runner splits the request. Reruns skip completed slices.

The operator measures database size before every group and each ranked publication.
A 145 MB stop leaves headroom below 30% of the 500 MB Free allowance. Comtrade
attempt and row budgets still apply. Source rows returned under a different HS
edition can be retained privately and cannot qualify as HS 2022 ranking evidence.

## Generate ranked market explanations

After publishing rankings, apply the ranked explanations migration and run:

```bash
npm run generate:explanations -- 1 090111
```

The arguments are the project's allowed requests per Pacific day (1–20,
default 1) and an optional HS6 code. Check the active limits in AI Studio
before raising the daily cap. With no HS6 argument, the command walks the
entire catalog. Each product with cache misses makes one request covering
its eligible markets. Supabase reserves quota before calls, counts failures
and allows one retry per evidence and quota day after a provider error. The
batch spaces calls and stops after a provider error. Rerun to fill remaining
misses. If Flash-Lite is unavailable and the project has verified Free-tier
access to Gemini 3.6 Flash, run with `TRADE_EXPLANATION_MODEL=gemini-3.6-flash`.
Both model choices use the same application cap and reuse validated cache entries.
The generator checks the same 145 MB database guard as backfill.

Gemini receives slot numbers and derived categories. The app constructs
sentences and figures from the snapshot and validates selected finding IDs
before use. The command reports requests, attempted market explanations, pass rate,
cache hits and fallbacks. A response that fails tracing counts against every
market included in that attempt. The SQL test under
`supabase/tests/ranked_explanations.sql` verifies the cache visibility and
daily budget. Use a disposable database for the fixture.

The public market page shows stored findings for its reference window and
a labeled local summary for a different window or a cache miss. The website
keeps working during a provider outage or before the cache is populated.

## Beginner exporter pilot

Start at `/` on a phone. The catalog lists every supported product, including
unroasted, non-decaffeinated coffee. Each product lists all available destinations
before a market is selected. Comparisons, the year picker, and answer citations
use the same snapshot. Questions and text selections in AI research use the
published comparison and links to official sources.

1. Recruit five Indonesian first-time exporters. Include people who can already
   supply a product and people exploring ideas. Ask each to pick a market on
   `/rankings` without help. Record elapsed time, search words, how they interpret
   the score, and where they ask for help. Capture three observed difficulties
   before revising the beginner copy.
2. Test the same task from `/` with the 2025 coffee example. Ask participants to
   name the trade year, distinguish import value from sales prospects, and choose
   a check they can do this week. Include a roasted-coffee seller or task. The
   first gate is four of five new testers finishing unaided in five minutes.
3. Follow up after one week. Record the action they completed, such as preparing
   a lot specification or checking destination requirements. Look for at least
   three concrete follow-ups before selecting the next two products for reviewed
   name, form, and action copy.

### Evaluate beginner Gemini briefs

The existing operator batch can generate a separate version of beginner
briefs using the same quota and cache tables.

```bash
npm run generate:explanations -- --beginner 1 090111
```

Beginner generation sends only anonymous slots and approved signal categories.
It checks three IDs per slot: a lead, a qualifying fact, and a research question.
Include Germany and China, the Australia–US score tie, conflicting directions,
missing years, and limited weight coverage in the review. Blank the labels and
have an Indonesian-speaking export adviser and pilot readers compare each brief
with the local rule. Record factual support, whether readers can explain the
trade-off, and the relevance of the next check.

The public beginner page starts with the deterministic brief. After a case
passes the review, configure `BEGINNER_GEMINI_APPROVED_CASES` on the web server
as a comma-separated list of approved `HS6:reporter` pairs. The reader validates
cached selections against the pinned release. Older years, unavailable
evidence, invalid selections, and cache misses use the deterministic brief.
Record the batch tracing pass rate and fallback count with the pilot results.

### Publish the green coffee outlook

The green coffee landing view orders markets by the sum of destination-reported
world import values over the four reference years. It uses only markets with a
valid total for each year and includes exact ties at the third-place cutoff.
The ranking uses all supplier countries and is independent of opportunity scores.

```bash
npm run generate:explanations -- --coffee-outlook 1
```

Apply the green coffee cache migration before enabling on-demand generation.
Configure `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` for the Next.js server
runtime only, alongside the existing anonymous snapshot reader settings. The
operator command supports one green coffee cohort and uses the same cache,
model configuration, and quota history as **Predict with AI**. Set
`COFFEE_AI_DAILY_CAP` and, if needed, `TRADE_EXPLANATION_MODEL` consistently in
both environments. Check the project's active limits in AI Studio before raising
the cap. Run after publishing an updated HS 090111 release if you want the
outlook ready ahead of the first visit.

Only anonymous signal categories are sent to Gemini. The service validates one
direction, one opportunity, and one risk and stores the selected IDs and
rendered text in the private `ai_analyses` cache. The four-year cohort defines
the market scope. An equivalent republication reuses the previous response and
its original timestamp. Older pinned releases can read the cache. On a failed
miss, the interface dates a previous successful analysis and marks it outdated,
or shows the deterministic outlook when there is no saved result. Run
`supabase/tests/green_coffee_analysis_cache.sql` against a disposable database to
check quota reservations, lease recovery, and access rules.
