# Product Requirements Document (PRD)

## Global Trade Intelligence --- Trade Monitoring & Competitive Intelligence

**Document status:** Initial product definition\
**Version:** 0.1\
**Date:** 22 November 2026\
**Product stage:** MVP / validation\
**Primary market hypothesis:** Indonesian exporters, manufacturers,
trading companies, and trade consultants\
**Working product name:** Global Trade Intelligence

------------------------------------------------------------------------

## 1. Product summary

Global Trade Intelligence is a web-based trade monitoring and
competitive intelligence product. It helps a user understand how demand
for a selected product is changing in a destination market, which
countries supply that market, and how supplier competitiveness changes
over time.

The MVP focuses on one workflow:

> A user selects a product and a destination market. The system
> retrieves and analyzes historical import statistics, tracks supplier
> market shares and changes, identifies noteworthy movements, and
> explains the results with evidence-backed AI summaries.

The product is **not** a general-purpose trade chatbot. Its core value
is the reliable collection, normalization, analysis, and monitoring of
trade statistics. AI is an explanatory layer on top of calculated
results; it is not the source of truth for numerical analysis.

## 2. Problem statement

Businesses exploring international markets often need to answer
questions such as:

-   Is demand for this product increasing in a particular country?
-   Which countries currently supply that market?
-   Which suppliers are gaining or losing market share?
-   Is Indonesia's position improving or weakening?
-   Are there destination markets showing sustained growth?
-   Has a competitor country's export performance changed significantly?

Finding and interpreting the relevant statistics can require navigating
multiple datasets, selecting product classifications, reconciling
reporting periods, comparing suppliers, and calculating trends manually.

The MVP aims to make this workflow faster and more repeatable by turning
official trade statistics into comparable market indicators and
monitored changes.

### 2.1 User problem to solve

A user should be able to move from:

"I am interested in exporting product X to country Y"

to:

"I can see the destination market's import trend, its major supplying
countries, how supplier shares have changed, and what movements deserve
further investigation."

The product does not claim that trade statistics alone prove commercial
opportunity or explain the cause of a change.

## 3. Goals and non-goals

### 3.1 MVP goals

1.  Allow a user to select a product using an HS code or product
    description mapped to an HS code.
2.  Allow a user to select a destination/importing market.
3.  Display historical imports for that product and market over the
    available selected period.
4.  Rank supplying countries for the selected market and period.
5.  Calculate supplier market shares and changes in those shares.
6.  Compare the selected supplier's position across periods, including
    Indonesia where data supports it.
7.  Identify notable changes using transparent, deterministic rules.
8.  Provide an AI-generated explanation grounded in the system's
    calculated indicators and source metadata.
9.  Show the source, reporting period, classification, units, and data
    limitations alongside results.
10. Preserve enough ingestion metadata to trace where displayed
    observations came from and when they were retrieved.

### 3.2 Non-goals for the MVP

The MVP will not:

-   Identify individual buyers, importers, exporters, or suppliers from
    aggregate UN Comtrade statistics.
-   Provide shipment-level tracking or live vessel/container visibility.
-   Guarantee that a market is commercially attractive or that a user
    can win business there.
-   Predict future demand or prices.
-   Provide definitive explanations for why a country's market share
    changed.
-   Replace customs brokers, legal advisors, tariff specialists, or
    market-entry consultants.
-   Provide complete global coverage for every HS code, country, period,
    and trade-flow combination.
-   Ingest every available trade record worldwide at launch.
-   Train or fine-tune a proprietary AI model.
-   Build native iOS or Android applications.
-   Support paid redistribution of source records until applicable data
    licensing and redistribution requirements have been reviewed.

## 4. Target users and jobs to be done

### Primary user hypotheses

-   **Indonesian exporters and manufacturers:** assess destination
    markets and understand supplier competition.
-   **Trading companies and distributors:** monitor demand and changes
    in the origin countries supplying a market.
-   **Export consultants and market researchers:** prepare repeatable
    market scans and client research.

These are hypotheses to validate, not confirmed customer segments.

### Jobs to be done

-   "When I consider exporting a product to a country, help me
    understand the size and direction of its import market."
-   "When I monitor a destination market, show me which supplier
    countries are gaining or losing share."
-   "When Indonesia's position changes, show me the underlying figures
    and whether the change is meaningful."
-   "When a market changes noticeably, notify me and explain what
    changed without pretending to know the cause."

## 5. Core user workflow

### 5.1 Select a product

The user searches for or selects a product classification.

-   The canonical analytical identifier is an HS code.
-   The interface should show the HS code, description, and
    classification edition.
-   If product-name search or AI-assisted HS-code suggestions are added,
    the user must confirm the code before analysis.
-   The MVP must not silently assume that a free-text product name maps
    unambiguously to one HS code.

### 5.2 Select a destination market

The user selects the importing/reporter country whose imports are being
analyzed.

The UI should make the trade-flow perspective explicit: for this
workflow, the destination market's **reported imports** are the primary
view.

### 5.3 Review market demand

Display:

-   Total reported import value by period.
-   Import growth between comparable periods.
-   Import quantity or net weight when reported and comparable.
-   A time-series chart.
-   Data coverage and reporting-status notes.

Value growth must not be described as physical demand growth unless
quantity/weight data supports that interpretation.

### 5.4 Review supplier competitiveness

For the selected destination market and product, display:

-   Supplying/partner countries.
-   Import value by supplier and period.
-   Supplier market share.
-   Change in market share in percentage points.
-   Change in import value.
-   Ranking changes where comparable data exists.
-   Indonesia's position when Indonesia is a supplier and the relevant
    data is available.

Market share calculation:

`Supplier market share (%) = supplier-reported/import-reported value attributed to supplier / destination market's total imports for the selected product and period × 100`

The implementation must define the chosen data perspective and apply it
consistently. The initial preferred view is destination-reported imports
by partner. Do not mix exporter-reported exports and
destination-reported imports in the same denominator without explicitly
labeling and reconciling the perspectives.

### 5.5 Review notable movements

The system flags noteworthy changes using transparent rules, for
example:

-   Large year-over-year import value change.
-   Large supplier market-share change.
-   Supplier entering or leaving the top-N ranking.
-   Several consecutive periods of growth or decline.
-   Significant change in supplier concentration.

Thresholds must be configurable in code or application settings and
clearly described. A flag means "worth investigating," not proof of an
opportunity, threat, or causal event.

### 5.6 Read the AI explanation

The AI summary should explain:

-   What changed.
-   Which indicators support the statement.
-   Which comparisons and periods are being used.
-   What cannot be concluded from the available data.
-   What the user might investigate next.

Every quantitative claim must be traceable to supplied backend results.
The model must not invent missing values, causes, company identities, or
forecasts.

## 6. Functional requirements

  -----------------------------------------------------------------------------
  ID                      Requirement                   Priority
  ----------------------- ----------------------------- -----------------------
  FR-01                   User can search/select an HS  P0
                          product code and see its      
                          description/classification.   

  FR-02                   User can select a             P0
                          destination/importing         
                          country.                      

  FR-03                   User can select an available  P0
                          historical period range.      

  FR-04                   System displays               P0
                          destination-market import     
                          value by period.              

  FR-05                   System ranks partner/supplier P0
                          countries by import value.    

  FR-06                   System calculates supplier    P0
                          market share and share        
                          changes.                      

  FR-07                   System shows Indonesia's      P0
                          supplier position when data   
                          is available.                 

  FR-08                   System identifies notable     P0
                          changes using deterministic   
                          rules.                        

  FR-09                   System generates a grounded   P0
                          AI explanation from           
                          calculated indicators.        

  FR-10                   System displays source,       P0
                          period, classification,       
                          units, and caveats.           

  FR-11                   System stores ingestion runs  P0
                          and retrieval timestamps.     

  FR-12                   User can save a               P1
                          product/market combination to 
                          a watchlist.                  

  FR-13                   System refreshes monitored    P1
                          data on a schedule.           

  FR-14                   System creates alerts when    P1
                          configured indicators cross   
                          thresholds.                   

  FR-15                   User can export a market      P2
                          summary or data table.        
  -----------------------------------------------------------------------------

P0 requirements define the initial demonstrable workflow. P1/P2 features
should not delay the first end-to-end prototype.

## 7. Data requirements and source strategy

### 7.1 Primary source

**UN Comtrade API** is the initial source for international merchandise
trade statistics.

Official resources:

-   Data portal: https://comtradeplus.un.org/
-   API documentation: https://comtrade.un.org/en/api-docs

The product should use the API to retrieve selected reporter, partner,
trade-flow, HS classification, product, and period combinations.

UN Comtrade provides broad international coverage, but the product must
not imply that every country reports every product and period completely
or on the same schedule.

### 7.2 Initial data scope

For the first prototype:

-   A small number of HS codes (approximately 1--3).
-   A small number of destination markets (approximately 5--10).
-   Approximately five years of annual observations, where available.
-   Destination-reported imports by partner as the primary
    supplier-comparison perspective.

Start narrow. Do not attempt to download the entire global database.

### 7.3 Data quality and interpretation rules

The system must:

-   Distinguish zero values from missing or unreported observations.
-   Preserve reporter, partner, flow, period, HS code, and
    classification edition.
-   Preserve source metadata and retrieval timestamps.
-   Track whether observations are reported, estimated, provisional, or
    otherwise flagged when source fields provide that information.
-   Record ingestion status and errors.
-   Handle revisions by retaining retrieval snapshots or a revision
    history where feasible.
-   Avoid comparing incompatible units or classification editions
    without an explicit conversion/concordance process.
-   Avoid treating trade value as a direct measure of physical volume.
-   Label mirror statistics carefully: reporter imports and
    partner-reported exports may differ because of valuation, timing,
    coverage, and methodology.
-   Avoid treating an absent record as zero trade.

### 7.4 Licensing and redistribution

API access does not automatically grant unrestricted rights to
redistribute original records in a commercial product. Before a paid
launch, review UN Comtrade's current terms and obtain written
clarification where needed. The MVP should retain source attribution and
avoid exposing bulk raw-source downloads until permissions are clear.

## 8. Analytics requirements

The analytics layer must be deterministic, testable, and independent of
the LLM.

Initial indicators:

1.  **Import value:** reported import value for the selected product and
    destination market.
2.  **Year-over-year growth:**
    `(current_period_value - prior_period_value) / prior_period_value × 100`,
    only when the denominator is valid and periods are comparable.
3.  **Supplier market share:** supplier value divided by total market
    imports for the same product, market, period, and data perspective.
4.  **Share change:** current market share minus prior-period market
    share, expressed in percentage points.
5.  **Supplier ranking:** ordering of suppliers by import value for the
    same period.
6.  **Supplier concentration:** optionally calculate an index such as
    HHI once its definition and interpretation are documented.
7.  **Quantity/weight trend:** calculate only when units and coverage
    are comparable.

All calculations should handle nulls, zero denominators, negative or
invalid values, and incomplete supplier totals explicitly.

## 9. AI requirements

### 9.1 Provider

Use the Gemini API temporarily through a server-side integration. Keep
the provider behind an application-level interface so the model provider
can be changed later without rewriting product logic.

### 9.2 Responsibilities

AI may:

-   Summarize calculated changes.
-   Explain indicators in plain language.
-   Compare supplied periods and suppliers.
-   Suggest follow-up questions or research directions.
-   Generate structured narrative summaries.

AI must not:

-   Calculate authoritative metrics that the backend can calculate
    deterministically.
-   fabricate source data or fill missing observations.
-   infer causal explanations as facts.
-   claim that market growth guarantees a commercial opportunity.
-   invent buyer/supplier company identities from aggregate statistics.
-   produce unqualified forecasts in the MVP.

### 9.3 Grounding and output validation

The backend must provide a compact, structured evidence payload to
Gemini. The model response should use a validated schema, for example:

-   `headline`
-   `summary`
-   `key_findings[]`
-   `evidence[]` (indicator name, period, value, comparison)
-   `caveats[]`
-   `suggested_investigations[]`

Validate AI output with Zod before returning it to the frontend. If the
response fails validation or contains unsupported claims, fail safely or
display a non-AI statistical summary.

## 10. UX and interface requirements

The MVP is a **responsive web application**, desktop-first for research
workflows and usable on mobile for quick review.

Initial pages/components:

1.  **Product and market selector:** HS product, destination market,
    period.
2.  **Market overview:** import value and trend chart.
3.  **Supplier comparison:** supplier ranking, market shares, share
    changes.
4.  **Notable movements:** rule-based findings and their supporting
    values.
5.  **AI explanation:** grounded narrative and caveats.

The UI should prioritize clear labels, units, periods, data provenance,
and comparison context over decorative complexity.

No native mobile application is required for the MVP.

## 11. Proposed technology stack

  -------------------------------------------------------------------------
  Layer                   Technology                Role
  ----------------------- ------------------------- -----------------------
  Framework               Next.js App Router        Frontend and backend in
                                                    one application

  Language                TypeScript                Application language
                                                    and type safety

  UI                      React                     Components and
                                                    interactions

  Styling                 Tailwind CSS              Styling

  UI components           shadcn/ui (optional)      Reusable interface
                                                    primitives

  Charts                  Recharts                  Time series and
                                                    comparisons

  Icons                   lucide-react              Icons

  Database                Supabase PostgreSQL       Persistent relational
                                                    data

  Database client         `@supabase/supabase-js`   Database access

  Next.js Supabase        `@supabase/ssr`           Server/browser clients
  integration                                       and auth integration

  Validation              Zod                       Request and AI response
                                                    validation

  AI                      `@google/genai`           Gemini API

  External trade data     UN Comtrade API           Trade statistics

  Hosting                 Vercel (initial target)   Next.js deployment

  Version control         Git + GitHub              Source control
  -------------------------------------------------------------------------

No separate Express server is required. No ORM is required initially;
use Supabase's client and version-controlled SQL migrations. Reconsider
an ORM only if project complexity makes it worthwhile.

### 11.1 Architectural boundaries

-   Next.js owns UI, route handlers, server-side orchestration, and
    business logic.
-   Supabase PostgreSQL stores normalized data and application records.
-   UN Comtrade is accessed only from server-side code.
-   Gemini is accessed only from server-side code.
-   Calculations live in a dedicated analytics module, not React
    components or route handlers.
-   External API clients live in dedicated modules.
-   Database schema changes are committed as SQL migrations.

## 12. Proposed application structure

``` text
global-trade-intelligence/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx
│   │   │   └── markets/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── trade/route.ts
│   │   │   ├── markets/route.ts
│   │   │   └── ai/analyze/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── charts/
│   │   ├── dashboard/
│   │   ├── tables/
│   │   └── ui/
│   ├── lib/
│   │   ├── analytics/
│   │   ├── comtrade/
│   │   ├── gemini/
│   │   ├── supabase/
│   │   └── validations/
│   └── types/
├── supabase/
│   └── migrations/
├── .env.example
├── .env.local
├── package.json
└── README.md
```

This structure is a starting point, not a requirement to create every
folder before it is needed.

## 13. Initial data model (subject to API verification)

The initial schema should include:

-   `countries`: country/area codes and names.
-   `hs_codes`: HS code, description, classification edition, and
    hierarchy metadata.
-   `trade_observations`: normalized source observations.
-   `ingestion_runs`: each retrieval/import attempt and its status.
-   `watchlists`: saved product/market combinations (P1).
-   `alerts`: generated monitoring events (P1).

The `trade_observations` schema must be finalized only after inspecting
actual UN Comtrade responses. Candidate dimensions include reporter,
partner, flow, classification, HS code, period, trade value, net weight,
quantity, unit, source flags, source identifiers, ingestion run, and
retrieval timestamp.

A uniqueness constraint must reflect the actual source observation
dimensions. Do not assume that a simplistic key such as HS code +
country + year is sufficient.

## 14. API surface (initial proposal)

Next.js Route Handlers provide the application API. These routes are
internal application endpoints, not a separate Express service.

  -----------------------------------------------------------------------
  Method                  Route                   Purpose
  ----------------------- ----------------------- -----------------------
  GET                     `/api/trade`            Retrieve selected
                                                  product/market
                                                  observations

  GET                     `/api/markets`          Retrieve calculated
                                                  market and supplier
                                                  indicators

  GET                     `/api/products`         Search/list available
                                                  HS products

  POST                    `/api/ai/analyze`       Generate grounded
                                                  explanation from
                                                  backend results

  POST                    `/api/admin/ingest`     Manually trigger a
                                                  restricted ingestion
                                                  task during development
  -----------------------------------------------------------------------

The route contracts should be documented and validated with Zod. Admin
ingestion must be protected and must never be exposed as an
unauthenticated public operation.

## 15. Security, privacy, and reliability

-   Keep all secret API keys server-side.
-   Never expose the Supabase service-role key in browser bundles.
-   Enable and test Row Level Security for user-owned records.
-   Validate and constrain all user inputs.
-   Apply rate limits to expensive AI endpoints.
-   Set reasonable request timeouts and handle upstream API failures.
-   Do not trust AI-generated output without schema validation.
-   Log ingestion failures and external API response metadata without
    logging secrets.
-   Avoid storing unnecessary personal information.
-   Use idempotent ingestion so retries do not create duplicate
    observations.
-   Keep database migrations in version control.
-   Provide clear loading, empty, stale-data, and error states.

## 16. Success metrics and validation

### Product usability criteria

A user can:

1.  Select a product and destination market.
2.  See historical import data.
3.  Identify the largest suppliers.
4.  Compare supplier market shares across periods.
5.  Identify meaningful changes.
6.  Read an explanation that accurately reflects the displayed evidence.

### Data quality criteria

-   Every displayed metric can be traced to source observations and a
    documented calculation.
-   Missing data is not silently converted to zero.
-   Market-share denominators and trade perspectives are consistent.
-   Periods, units, and classifications are visible.
-   Re-running ingestion does not create duplicate observations.

### Business validation questions

Test with actual exporters, manufacturers, trading companies, and
consultants:

-   Do they currently perform this analysis?
-   How do they perform it?
-   Which decisions does it inform?
-   Which product/market combinations matter most?
-   What data is missing from this product?
-   Would they return to monitor changes?
-   Would they pay for monitoring, alerts, reports, or workflow
    integration?

The MVP is not validated merely because the dashboard works. It is
validated when target users find the analysis useful enough to change a
decision, save research time, or return to monitor the market.

## 17. Delivery milestones

### Milestone 1 --- Foundation

-   Initialize Next.js App Router project with TypeScript.
-   Configure Tailwind.
-   Create Supabase project and connect it.
-   Configure environment variables.
-   Set up Git repository and basic project documentation.

**Deliverable:** a running Next.js application connected to Supabase
PostgreSQL.

### Milestone 2 --- First data integration

-   Inspect UN Comtrade API documentation and actual responses.
-   Implement a server-side API client.
-   Retrieve a narrow sample of historical observations.
-   Normalize and validate the records.
-   Create SQL migrations and persist observations.
-   Make ingestion idempotent.

**Deliverable:** real, traceable UN Comtrade records stored in Supabase.

### Milestone 3 --- Analytics

-   Implement import trend calculations.
-   Implement supplier ranking and market-share calculations.
-   Implement share-change and notable-movement rules.
-   Add tests for edge cases and missing data.

**Deliverable:** deterministic analytical results.

### Milestone 4 --- AI explanation

-   Integrate Gemini server-side.
-   Define evidence payload and response schema.
-   Validate output and handle model errors.
-   Display grounded summaries and caveats.

**Deliverable:** evidence-backed AI explanations.

### Milestone 5 --- MVP interface

-   Build product/market selection.
-   Build market overview and charts.
-   Build supplier comparison.
-   Build notable movements and AI explanation.

**Deliverable:** complete end-to-end user workflow.

### Milestone 6 --- Monitoring improvements

-   Add watchlists and authentication when needed.
-   Add scheduled refresh and data availability checks.
-   Add alerts and report export.
-   Revisit infrastructure only when measured usage requires it.

## 18. Key risks and open questions

  -----------------------------------------------------------------------
  Risk / question                     Mitigation
  ----------------------------------- -----------------------------------
  Missing or delayed country          Show coverage and freshness; do not
  reporting                           infer zero

  HS classification changes           Store classification edition; add
                                      concordance only when needed

  Mirror-statistic discrepancies      Choose and label one primary
                                      reporting perspective

  Trade value affected by             Separate value and physical
  prices/FX/product mix               quantity analysis

  AI hallucinates explanations        Ground with backend metrics,
                                      validate output, show caveats

  Existing products already offer     Validate a differentiated workflow
  broad trade statistics              and target segment

  Commercial redistribution           Review current UN Comtrade terms
  restrictions                        before paid launch

  Data ingestion grows beyond         Start with small batches; introduce
  serverless limits                   background workers only when needed

  Users want company-level            Treat as a separate data problem;
  buyer/supplier data                 aggregate statistics do not
                                      identify companies
  -----------------------------------------------------------------------

## 19. MVP release definition

The first MVP is ready for user testing when:

-   A user can select one supported HS code and one supported
    destination market.
-   The application can show multiple years of destination-reported
    imports, subject to source availability.
-   The application can rank suppliers and calculate market shares
    consistently.
-   The application can highlight at least one type of meaningful change
    using deterministic logic.
-   Gemini can explain the supplied results without inventing numbers or
    causal claims.
-   The interface displays source and data limitations.
-   The complete workflow works from the Next.js UI through Supabase and
    the external APIs.

**The first release should prove the workflow, not global data
coverage.**
