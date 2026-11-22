# AGENTS.md

## Repository instructions for AI coding agents

This file defines the product context, technical constraints, coding
conventions, and working rules for AI coding agents contributing to the
Global Trade Intelligence project.

Read this file before making changes. The PRD (`PRD.md`) is the product
requirements source of truth. If an implementation request conflicts
with the PRD or these instructions, identify the conflict before
proceeding.

------------------------------------------------------------------------

## 1. Project purpose

Build a web-based **Global Trade Intelligence** product focused
initially on **Trade Monitoring & Competitive Intelligence**.

The first workflow:

1.  A user selects a product (identified by an HS code).
2.  A user selects a destination/importing market.
3.  The application displays historical import demand.
4.  The application ranks supplier countries.
5.  The application calculates supplier market shares and changes over
    time.
6.  The application flags noteworthy movements using deterministic
    rules.
7.  Gemini generates an evidence-backed explanation of the calculated
    results.

This is a monitoring and analytical product, not a generic trade
chatbot.

### Product principles

-   Accuracy and traceability are more important than impressive-looking
    AI output.
-   The backend is the source of truth for numerical calculations.
-   AI explains results; it does not invent or authoritatively calculate
    trade statistics.
-   Every important metric must be traceable to source observations and
    a documented calculation.
-   Missing data is not zero.
-   Do not imply causation or guaranteed commercial opportunity from
    descriptive trade statistics.
-   Build a narrow, working vertical slice before adding broad features.

Refer to `PRD.md` for complete requirements, scope, and milestones.

## 2. Technology stack --- keep it simple

Use the following stack unless the project owner explicitly approves a
change:

-   **Next.js** with App Router --- frontend and backend.
-   **TypeScript** --- primary language.
-   **React** --- UI.
-   **Tailwind CSS** --- styling.
-   **Supabase PostgreSQL** --- managed relational database.
-   **`@supabase/supabase-js`** --- Supabase client.
-   **`@supabase/ssr`** --- Supabase integration for Next.js
    server/client contexts.
-   **Gemini API via `@google/genai`** --- temporary AI provider.
-   **UN Comtrade API** --- initial trade data source.
-   **Zod** --- runtime validation.
-   **Recharts** --- charts.
-   **lucide-react** --- icons.
-   **Vercel** --- initial deployment target.
-   **Git/GitHub** --- version control.

### Explicitly do not introduce without approval

-   Express or another separate backend server.
-   A microservice architecture.
-   Prisma or Drizzle ORM.
-   Redis, Kafka, Kubernetes, or a vector database.
-   A separate Python service.
-   Native iOS or Android applications.
-   A second AI provider.
-   A paid third-party trade-data provider.

These may be considered later if actual product requirements justify
them. Do not add infrastructure preemptively.

### Database access

Use Supabase's JavaScript client and SQL migrations initially. Do not
introduce an ORM by default.

Keep SQL schema changes in version-controlled migration files under
`supabase/migrations/`.

## 3. Application architecture

### Next.js responsibilities

Next.js owns:

-   UI and page routing.
-   Server Components and Client Components.
-   Route Handlers for application API endpoints.
-   Server-side orchestration of external APIs.
-   Application business logic.
-   Authentication integration when introduced.

There is no Express server.

### Supabase responsibilities

Supabase provides:

-   PostgreSQL storage.
-   Authentication when required.
-   Row Level Security for user-owned data.
-   Database management and migrations.

### External services

-   UN Comtrade is called from server-side application code only.
-   Gemini is called from server-side application code only.
-   Never expose secret API keys in browser code.

### Suggested source layout

Follow the existing repository layout if one is already established.
Otherwise, use this as the starting point:

``` text
src/
├── app/
│   ├── (dashboard)/
│   ├── api/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── charts/
│   ├── dashboard/
│   ├── tables/
│   └── ui/
├── lib/
│   ├── analytics/
│   ├── comtrade/
│   ├── gemini/
│   ├── supabase/
│   └── validations/
└── types/

supabase/
└── migrations/
```

Do not create empty abstractions or folders solely to match this
diagram. Add files when a real feature needs them.

## 4. Domain rules: trade data

These rules are mandatory.

### 4.1 Trade observation dimensions

Preserve the dimensions required to interpret each observation,
including as provided by the source:

-   Reporter country/area.
-   Partner country/area.
-   Trade flow.
-   Product code (HS code).
-   Classification edition.
-   Period.
-   Trade value and currency/unit context.
-   Net weight and unit, when available.
-   Quantity and supplementary unit, when available.
-   Source flags/statuses and source identifiers, when available.
-   Retrieval timestamp and ingestion-run reference.

Do not assume that HS code + country + year uniquely identifies a
record. Confirm the source's actual observation dimensions before
defining database uniqueness constraints.

### 4.2 Missing values and zeros

-   Never convert a missing observation into zero without an explicit,
    documented rule.
-   Distinguish zero trade, unreported data, unavailable data, and
    failed retrieval.
-   Do not use `|| 0` as a shortcut for missing trade values.
-   Preserve `null` where the source does not provide a value.
-   UI must communicate unavailable or incomplete data clearly.

### 4.3 Reporting perspective

For the initial supplier-comparison workflow, prefer the destination
market's **reported imports by partner**.

-   Keep reporter and partner roles explicit.
-   Keep import and export flows explicit.
-   Do not combine destination-reported imports with exporter-reported
    exports in one calculation unless the analytical method explicitly
    requires it and labels the result.
-   Mirror statistics can differ because of valuation, timing, coverage,
    and methodology. Do not silently overwrite one perspective with the
    other.

### 4.4 Periods, classifications, and units

-   Compare like periods with like periods.
-   Do not compare incompatible quantity units.
-   Do not assume all records use the same HS classification edition.
-   Do not merge HS revisions without an explicit concordance/mapping
    strategy.
-   Preserve the original source code and classification metadata.
-   Treat trade value growth as value growth, not automatically as
    physical demand growth.

### 4.5 Source provenance and revisions

-   Preserve source attribution.
-   Record when data was retrieved.
-   Associate imported records with ingestion runs.
-   Make ingestion idempotent.
-   Consider source revisions; do not assume a previously retrieved
    record can never change.
-   Never fabricate source metadata.

## 5. Analytics rules

All authoritative trade calculations belong in deterministic backend
modules under `src/lib/analytics/`.

Do not calculate business-critical indicators in React components or ask
Gemini to calculate them.

Initial indicators:

-   Import value by period.
-   Year-over-year import value growth.
-   Supplier ranking.
-   Supplier market share.
-   Supplier market-share change in percentage points.
-   Indonesia's supplier position, when available.
-   Notable changes based on explicit rules.

### Calculation requirements

-   Handle missing values.
-   Handle zero denominators safely.
-   Handle incomplete supplier totals.
-   Handle periods that are not comparable.
-   Keep units explicit.
-   Document the denominator and reporting perspective for every share
    calculation.
-   Use decimal-safe numeric handling where appropriate; do not
    introduce avoidable floating-point errors in financial calculations.
-   Add tests for normal cases and edge cases.

Example:

`market_share_pct = supplier_import_value / total_destination_import_value * 100`

Only calculate this when the numerator and denominator refer to the same
product, destination market, period, classification context, currency
basis, and reporting perspective.

A market-share change is:

`current_share_pct - previous_share_pct`

Express this in **percentage points**, not percent growth.

Notable-movement detection must use deterministic, documented
thresholds. A detected movement means "worth investigating," not
"commercial opportunity confirmed."

## 6. AI and Gemini rules

Gemini is a replaceable provider integration, not the core analytics
engine.

### Allowed AI responsibilities

-   Explain calculated results.
-   Summarize market movements.
-   Compare supplied indicators and periods.
-   Explain terminology.
-   Suggest follow-up research questions.
-   Generate structured narrative output.

### Disallowed AI responsibilities

-   Invent trade observations.
-   Fill missing data with guessed values.
-   Produce authoritative market-share or growth calculations.
-   Claim a causal reason for a change without supporting evidence.
-   Claim that demand growth guarantees an export opportunity.
-   Identify individual companies from aggregate country-level trade
    statistics.
-   Present forecasts as facts.

### Grounding contract

Before calling Gemini:

1.  Retrieve the relevant records from Supabase.
2.  Calculate metrics in backend code.
3.  Construct a compact evidence payload with periods, units, source
    perspective, and caveats.
4.  Send only the necessary context to Gemini.
5.  Request structured output.
6.  Validate the response with Zod.
7.  Return the validated result to the frontend.

If the model fails, times out, or returns invalid output, preserve
access to the deterministic statistics and show a clear fallback
message.

Do not allow arbitrary user input to turn the AI endpoint into
unrestricted database access or an unrestricted tool-execution agent.

## 7. API and route-handler rules

Use Next.js Route Handlers under `src/app/api/`.

Initial route proposals:

-   `GET /api/trade`
-   `GET /api/markets`
-   `GET /api/products`
-   `POST /api/ai/analyze`
-   `POST /api/admin/ingest` (restricted development/admin operation
    only)

Rules:

-   Validate query parameters and request bodies with Zod.
-   Return consistent response shapes and appropriate HTTP status codes.
-   Do not expose raw database errors, secret values, or stack traces to
    clients.
-   Keep route handlers thin: validate, call domain/service functions,
    format response.
-   Put business logic in `src/lib/`.
-   Protect administrative ingestion routes; never leave them publicly
    callable without authorization.
-   Avoid unbounded queries and unbounded upstream API requests.
-   Add pagination or limits where result sets may grow.

## 8. Supabase and security rules

-   Use `@supabase/ssr` for Next.js cookie-aware authentication
    integration when auth is implemented.
-   Keep browser and server Supabase clients separate.
-   Never use the service-role key in browser/client components.
-   Use the public/anon key only in the intended client configuration
    and rely on RLS for authorization.
-   Enable RLS on user-owned tables.
-   Do not assume a hidden UI element is a security boundary.
-   Validate authorization on the server.
-   Do not commit `.env.local` or secrets.
-   Maintain `.env.example` with variable names and empty/example values
    only.
-   Never log API keys, access tokens, or sensitive headers.

Expected environment variables:

``` env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

COMTRADE_API_KEY=
GEMINI_API_KEY=
```

Only variables that are actually used should be added to runtime
configuration. Keep secret variables server-only.

## 9. Code quality and TypeScript conventions

-   Use TypeScript for new application code.
-   Prefer explicit types for domain entities and external API
    responses.
-   Treat external API payloads as untrusted input; validate/normalize
    them at the boundary.
-   Avoid `any`. If unavoidable at an external boundary, narrow it
    immediately.
-   Prefer small, focused modules and functions.
-   Use descriptive names tied to trade-domain concepts.
-   Keep pure calculations separate from I/O.
-   Avoid premature abstractions and generic frameworks.
-   Do not duplicate business rules across routes and components.
-   Reuse existing dependencies before adding new ones.
-   Do not add a dependency for a trivial helper that can be implemented
    clearly with existing tools.
-   Keep comments focused on why a non-obvious decision exists, not
    narrating obvious code.

## 10. UI and UX rules

-   Build a responsive web application.
-   Optimize the primary research workflow for desktop.
-   Ensure core views remain usable on mobile browsers.
-   Prioritize clear units, reporting periods, source labels, and
    caveats.
-   Charts must label their metric, unit, and period.
-   Tables should make supplier rankings and share changes easy to
    compare.
-   Distinguish unavailable data from zero values visually and
    semantically.
-   Avoid presenting an AI narrative without its supporting metrics.
-   Use loading, empty, stale-data, and error states.
-   Do not build a native mobile app for the MVP.

## 11. Testing expectations

Add tests for domain logic, especially analytics.

At minimum, test:

-   Market-share calculations.
-   Zero denominator behavior.
-   Missing observations.
-   Supplier ranking.
-   Percentage-point share changes.
-   Year-over-year calculations with missing prior periods.
-   Unit or classification incompatibility handling.
-   Validation of UN Comtrade payloads.
-   Validation of Gemini structured output.
-   Idempotent ingestion behavior where practical.

Do not claim a test passed unless it was actually run.

When changing a calculation, update its tests and explain any changed
interpretation.

## 12. Data ingestion rules

-   Start with a small, explicitly selected set of HS codes, countries,
    and annual periods.
-   Do not attempt full global ingestion for the MVP.
-   Respect UN Comtrade API limits and subscription terms.
-   Use server-side API calls.
-   Handle pagination, rate limits, transient failures, and partial
    responses.
-   Store ingestion-run status and useful error details.
-   Make retries safe and ingestion idempotent.
-   Avoid running large imports inside a normal user-facing request.
-   For the initial prototype, manual restricted ingestion is
    acceptable.
-   Introduce scheduled jobs or a separate worker only when the product
    requires reliable recurring ingestion or serverless execution limits
    become a real constraint.

## 13. Licensing and attribution

-   Do not assume API access grants unrestricted commercial
    redistribution rights.
-   Preserve source attribution and relevant source metadata.
-   Do not add raw bulk-data export or resale functionality without
    reviewing current UN Comtrade terms.
-   Flag licensing uncertainty to the project owner before implementing
    a commercial distribution feature.

## 14. Working process for coding agents

Before implementation:

1.  Inspect the existing repository and current package versions.
2.  Read `PRD.md` and this file.
3.  Identify the smallest change that advances the current milestone.
4.  Check existing patterns before introducing new ones.
5.  If a requirement is ambiguous or source/API behavior is unknown,
    inspect official documentation or actual sample responses instead of
    guessing.

During implementation:

1.  Work in small, coherent steps.
2.  Prefer one vertical slice over broad scaffolding.
3.  Keep the implementation aligned with the selected stack.
4.  Validate external data at system boundaries.
5.  Add or update tests for domain behavior.
6.  Avoid unrelated refactors.
7.  Do not silently change product scope, schema semantics, or
    calculation definitions.

After implementation:

1.  Run relevant tests, linting, and type checks when available.
2.  Report the exact commands run and whether they passed.
3.  Summarize files changed.
4.  Identify assumptions, limitations, and follow-up work.
5.  Do not claim features, integrations, or deployments work unless
    verified.

### Agent decision rule

If an implementation shortcut would make trade data less accurate, less
traceable, or misleading, do not take the shortcut. Explain the
trade-off and choose the safer representation.

## 15. Current implementation priority

Unless the project owner changes priorities, follow this order:

1.  Initialize and configure the Next.js + TypeScript application.
2.  Connect Supabase PostgreSQL.
3.  Inspect actual UN Comtrade API responses.
4.  Design and migrate the minimum viable trade-observation schema.
5.  Ingest a small sample idempotently.
6.  Implement deterministic analytics and tests.
7.  Integrate Gemini for grounded explanations.
8.  Build the product/market research interface.
9.  Add watchlists, scheduled monitoring, and alerts after the core
    workflow works.

**Do not start by building a generic AI chat interface. Build the
data-to-insight workflow first.**
