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
icon dependencies. The database schema and ingestion client will be
added after the actual UN Comtrade response shape is verified.

Never commit `.env.local` or any API keys.
