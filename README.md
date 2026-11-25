# Global Trade Intelligence

Compare destination markets for Indonesian export products. Start with the
opportunity ranking, then open a market to inspect import trends, suppliers,
Indonesia’s share and comparable unit values.

The shared dataset covers **12 HS 2022 products, 10 markets and 2022–2025**.
The cohort was published on **24 November 2026 (UTC)**. Each ranking displays its
own publication date. Trade years show when imports were reported, while the
publication date shows when the dashboard snapshot was prepared.
Source: UN Comtrade.

```mermaid
flowchart LR
    C[UN Comtrade] --> O[Operator batch]
    O --> S[Published Supabase snapshots]
    O --> G[Gemini selects findings]
    G --> O
    S --> W[Read-only Next.js dashboard]
```

## Run the app

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`. For the dashboard, configure the
   Supabase project URL and public reader key. Keep writer and provider
   credentials in the operator environment.
3. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

Open **Rankings** to see the shortlist and all screened markets. On a
market page, change the year range to explore the same snapshot. Use
**Methodology** to reproduce the score and interpret exclusions and weight
coverage. **Pilot** opens the India solar regression case.

Run `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`
before proposing a release. Use `npm run build -- --webpack` where the local
environment requires Webpack.

## Publish and maintain data

Apply the migrations to a development database before preparing snapshots.
See the [operator runbook](docs/vertical-slice.md) for ingestion, storage
limits, publication, Gemini generation and SQL checks. The [architecture](docs/architecture.md)
describes reader and writer boundaries. The [PRD](docs/PRD.md) defines the
release and [AGENTS.md](docs/AGENTS.md) records engineering and secrets rules.

## Known limitations

- Scores compare eligible markets within one product cohort. The curated
  catalog and requirement for reported Indonesian share can omit promising
  destinations. Treat the shortlist as a starting point for research.
- Missing reports or incompatible observations can leave a market unranked.
  Limited observed weights can suppress unit-value comparisons. Unit value
  can vary with product mix and is unsuitable as a transaction price.
- Annual reporting and revisions limit freshness. The app serves the last
  published snapshot and uses local summaries when cached findings are unavailable.
  Supabase Free can pause after inactivity.
- The free demo displays attributed analytical results and keeps raw
  observations private. Review any change in distribution or commercial use
  against the [UN Comtrade guidance](https://uncomtrade.org/docs/re-dissemination-of-data/).

## Monitoring design

If exporters regularly revisit the same pairs, add authenticated, private
watchlists with RLS scoped to each owner. After successfully publishing a
snapshot, compare watched indicators between comparable periods and notify
only on a threshold crossing. Key deliveries by watch rule and snapshot so
retries cannot resend an alert. Suppress alerts when data is incomplete,
allow mute and unsubscribe, and publish the refresh date and any data gaps.
Accounts, watchlists, scheduled refresh and alerts remain a design.
