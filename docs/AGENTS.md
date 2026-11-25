# Engineering instructions

Read the [PRD](PRD.md) for product scope, the [architecture](architecture.md) for the ranked
release, and the [pilot runbook](vertical-slice.md) for current setup. Surface conflicts before changing
product scope, schema semantics, or calculation definitions.

## Stack and boundaries

- Use the existing Next.js App Router, TypeScript, React, Tailwind CSS, Recharts,
  lucide-react, and Zod stack. Vercel is the initial hosting target.
- Use Supabase PostgreSQL with `@supabase/supabase-js` and SQL migrations in
  `supabase/migrations/`. Use `@supabase/ssr` for cookie-aware auth when introduced.
- The public Next.js app reads published snapshots through a least-privilege reader.
  Validate selectors and keep ranking, detail, quality and explanations on one snapshot.
- Restrict Comtrade, privileged database writes and Gemini to the operator-run batch.
  Precompute in TypeScript using the existing analytics and validation modules.
  The legacy ingestion and AI POST URLs return HTTP 410.
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
- Checkpoint imports by candidate and period. Keep retries idempotent. Bound upstream work, handle rate limits,
  partial results and transient failures, and retain run status and safe error details.
  Add pagination or background work when coverage or request duration requires it.
- Version the candidate cohort and scoring method. Preserve component values, exclusions,
  observation revisions and run references so each published score can be reproduced.
- Validate generated findings against the batch evidence. Cache by canonical evidence
  hash and generation version, and serve the deterministic fallback on failure.
- Keep periods, units, source, and caveats visible on desktop and mobile. Include
  loading, empty, stale-data, and error states alongside accessible charts and tables.

## Security and verification

- Authorize pilot admin operations server-side. In the target deployment, grant the
  reader access only to published results. Keep batch secrets out of the web runtime.
  Apply and test RLS if user-owned records are introduced.
- Keep raw upstream errors, sensitive headers, and stack traces out of client responses
  and logs. Limit collection of personal information.
- Prefer existing modules and dependencies. Validate external payloads, make small
  focused changes, and test analytics edge cases, upstream validation, and retry
  behavior when relevant.
- Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` as relevant.
  Report the checks actually run, along with any live integrations still unverified.

## Secrets and Security

- Never print, expose, or log environment variable values.
- Never read or display the contents of `.env.local` directly.
- Environment variables may be loaded at runtime for legitimate application execution
  and integration testing.
- Never transmit secrets to unauthorized external services.
- Never commit environment files or credentials to Git. The tracked `.env.example`
  contains placeholders only.
- Verify environment variable availability using boolean checks rather than printing
  their values.
