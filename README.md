# Global Trade Intelligence

Global Trade Intelligence helps Indonesian exporters research destination markets.
The proposed release ranks a curated set of markets for each HS product, explains
the score, and links to supplier evidence in a dated snapshot.

**Runnable today:** the [India solar pilot](docs/vertical-slice.md) shows annual
imports of HS 854142, supplier rankings, and Indonesia’s position from an
operator-published snapshot. The broader catalog, ranking page, methodology page,
quality badges and batch publication are planned.

## Getting started

Install dependencies:

```bash
npm install
```

Create a local environment file from the template and fill in only the
credentials available for the current development milestone:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Quality checks:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Product and architecture

The [PRD](docs/PRD.md) defines the user workflow, proposed score and release criteria.
The [architecture](docs/architecture.md) diagrams how a batch publishes Supabase
snapshots for the read-only web app. See the [engineering instructions](docs/AGENTS.md)
for project conventions and credential handling.

## Known limitations

The local pilot covers one product and market. Future rankings will reflect the
selected candidate pool and available annual reports. Missing partner observations
and weights limit comparisons. The public release requires a review of permissions
for displaying derived results. Supabase Free projects can pause during inactivity;
check availability and restore the project before a planned user session.
[Supabase project pausing](https://supabase.com/kb/faqs/platform/free-project-pausing)

## Deferred monitoring design

If researchers return to track the same pairs, an authenticated account could own
a private watchlist. On publication of a new annual snapshot, a job could compare
watched indicators with saved thresholds and deliver one alert per crossing. Accounts,
watchlists, scheduled monitoring and alerts are design-only. Export is out of scope.
