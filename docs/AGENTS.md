# Engineering instructions

Read the [PRD](PRD.md) for product scope and acceptance criteria and the
[pilot runbook](vertical-slice.md) for current setup. Surface conflicts before changing
product scope, schema semantics, or calculation definitions.

## Stack and boundaries

- Use the existing Next.js App Router, TypeScript, React, Tailwind CSS, Recharts,
  lucide-react, and Zod stack. Vercel is the initial hosting target.
- Use Supabase PostgreSQL with `@supabase/supabase-js` and SQL migrations in
  `supabase/migrations/`. Use `@supabase/ssr` for cookie-aware auth when introduced.
- Keep route handlers in `src/app/api/`. Validate requests, invoke domain functions in
  `src/lib/`, and return consistent responses with appropriate status codes.
  The pilot uses `GET /api/trade`, `POST /api/admin/ingest`, and
  `POST /api/ai/analyze`. Add product and market lookup routes as selection expands.
- Keep UN Comtrade and Gemini (`@google/genai`) calls server-side. Keep pure
  calculations in `src/lib/analytics/` and isolate external I/O.
- Get approval before adding a separate backend or Python service, microservices,
  an ORM, new infrastructure such as Redis or a vector database, native apps,
  an additional AI provider, or a paid data provider.

## Data integrity

- Verify source dimensions against official documentation or actual responses.
  Preserve those dimensions, flags, units, source attribution, retrieval time, and
  ingestion-run ID. Design uniqueness around the full observation key.
- Keep missing values as `null` and distinguish absent data, failed retrieval, and
  reported zero. Keep mirror exports separate from destination-reported imports.
  Apply the PRD’s matching, denominator, and year-comparison rules in the backend.
  Keep numeric precision appropriate for the calculation.
- Keep imports narrow and idempotent. Bound upstream work, handle rate limits,
  partial results and transient failures, and retain run status and safe error details.
  Add pagination or background work when coverage or request duration requires it.
- Build Gemini evidence from backend calculations. Bound and validate input and
  output with Zod, preserve the dashboard on provider failure, and restrict the
  model to the evidence supplied. Keep free-form input away from database and tool access.
- Keep periods, units, source, and caveats visible on desktop and mobile. Include
  loading, empty, stale-data, and error states alongside accessible charts and tables.

## Security and verification

- Authorize admin operations server-side and rate-limit costly public operations.
  Keep the Supabase service-role key and provider keys server-only, enforce RLS on
  user-owned tables, and keep client and privileged Supabase access separate.
- Keep `.env.local` untracked and `.env.example` limited to placeholders. Keep secrets,
  raw upstream errors, sensitive headers, and stack traces out of client responses
  and logs. Limit collection of personal information.
- Prefer existing modules and dependencies. Validate external payloads, make small
  focused changes, and test analytics edge cases, upstream validation, and retry
  behavior when relevant.
- Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` as relevant.
  Report the checks actually run, along with any live integrations still unverified.
