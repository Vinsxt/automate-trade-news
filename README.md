# Global Trade Intelligence

Global Trade Intelligence is a Next.js application for monitoring
international trade demand and supplier competitiveness. The product
uses deterministic backend analytics over traceable UN Comtrade data;
Gemini is an explanatory layer, not the source of numerical truth.

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
npm run lint
npm run typecheck
npm run build
```

## Project guidance

- Product requirements: [`docs/PRD.md`](docs/PRD.md)
- Repository instructions: [`docs/AGENTS.md`](docs/AGENTS.md)

The current foundation contains the Next.js App Router, TypeScript,
Tailwind CSS, and the approved Supabase, Gemini, validation, chart, and
icon dependencies. The first data slice targets India (reporter 699)
and HS 854142 (photovoltaic cells not assembled into modules), using
destination-reported imports by partner for 2021--2025. It stores
validated observations and ingestion-run metadata in Supabase.

During development, trigger the restricted ingestion route with:

```bash
curl -X POST http://localhost:3000/api/admin/ingest \
  -H "Authorization: Bearer $INGEST_ADMIN_TOKEN"
```

The route requires `INGEST_ADMIN_TOKEN`, Supabase service-role
credentials, and server-side access to the UN Comtrade API. Never expose
these values to browser code or commit `.env.local`.

Never commit `.env.local` or any API keys.
