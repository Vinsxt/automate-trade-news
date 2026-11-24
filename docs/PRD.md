# Global Trade Intelligence PRD

**Stage** — MVP validation

**Product** — Trade monitoring and competitive intelligence for Indonesian exporters,
manufacturers, traders, distributors, and trade researchers. These customer segments
are hypotheses to validate.

## Product goal

Help a researcher assess an export market by choosing an HS product and a destination,
seeing what the destination imports and from whom, comparing supplier positions over
time, and identifying movements worth investigating. Replace manual data collection
and calculation with a repeatable, traceable workflow.

Country-level trade statistics support research into market size and supplier trends.
Shipment tracking, company identification, forecasts, causal conclusions, commercial
guarantees, and professional trade or customs advice are outside MVP scope. The MVP is
a responsive web dashboard with evidence-backed explanations. General-purpose chat,
native apps, model training, and comprehensive global coverage are deferred.

## Functional requirements

| ID | Priority | Requirement |
| --- | --- | --- |
| FR-01 | P0 | Select or search for an HS code and show its description and edition. Require confirmation if suggesting a code from free text. |
| FR-02 | P0 | Select an importing market and label it as the reporter. |
| FR-03 | P0 | Select an available historical period range. |
| FR-04 | P0 | Chart reported import value and comparable year-over-year changes. Show quantity or net weight when coverage and units allow. |
| FR-05 | P0 | Rank supplying countries by import value for the selected period. |
| FR-06 | P0 | Show supplier shares, percentage-point share changes, and comparable value and rank changes. |
| FR-07 | P0 | Show Indonesia’s supplier position when supported by the data. |
| FR-08 | P0 | Flag meaningful movements using documented, configurable thresholds. Start with one rule such as a material year-over-year value or supplier-share change. |
| FR-09 | P0 | Explain calculated results with Gemini and retain access to the statistics when explanations fail. |
| FR-10 | P0 | Show source, reporting perspective, period, edition, units, freshness, and data caveats beside results. |
| FR-11 | P0 | Record ingestion runs, retrieval timestamps, source metadata, and errors. Support safe retries. |
| FR-12 | P1 | Save product and market combinations to authenticated watchlists. |
| FR-13 | P1 | Refresh monitored data on a schedule and check source availability. |
| FR-14 | P1 | Alert users when a configured threshold is crossed. |
| FR-15 | P2 | Export a market summary or table, subject to source permissions. |

Design for desktop research and mobile review. Include loading, empty, stale-data, and
error states. Label chart metrics and units, and keep explanations next to the statistics
they describe.

## Data and calculations

- Use annual, destination-reported imports by partner from [UN Comtrade](https://comtradeplus.un.org/).
  Keep mirror exports labeled and separate. Start with the [India solar pilot](vertical-slice.md)
  and expand toward 1–3 HS codes, 5–10 markets, and about five years where coverage supports it.
- Preserve the source’s reporter, partner and other observation dimensions, flow, frequency,
  HS edition and original code, period, values, units, weights and quantities, and source
  flags or IDs. Key observations on those dimensions and link them to their retrieval run.
  Retain revision history where feasible.
- Distinguish missing, unreported, unavailable, failed, and zero values. Compare like periods,
  units and editions. Use explicit conversions or HS concordance where required.
- Use the source world-total row for total market imports and the share denominator.
  Divide the supplier’s destination-reported import value by the matching world total
  and multiply by 100. Match the product, reporter, period, edition, units, and perspective.
  Keep unavailable or zero-denominator shares unavailable.
- Calculate annual growth as `(current − prior) / prior × 100` for comparable consecutive
  years with a positive prior value. Calculate share changes as current share minus
  prior share in percentage points. Rank suppliers by import value within each period.
  Handle invalid values and incomplete supplier coverage explicitly.
- Describe trade value in currency terms. Use comparable quantities or weights to discuss
  physical volume. Present movement flags as reasons for further research.
- Preserve attribution and review current UN Comtrade terms before commercial
  redistribution or bulk raw-data downloads. Seek clarification where required.

## Gemini contract

Send a bounded payload of stored, calculated indicators with periods, units, reporting
perspective, and caveats. Ask for a structured explanation of what changed, supporting
evidence, limits, and useful follow-up research. Validate the response with Zod, require
quantitative claims to trace back to the supplied evidence, and reject unsupported
claims. Keep provider access server-side with timeouts, rate limits, and a fallback that
preserves the deterministic dashboard.

## Delivery and release

| Milestone | Evidence |
| --- | --- |
| Foundation and ingestion | Next.js connects to Supabase. A restricted import stores real Comtrade observations and run metadata. A retry preserves unique observations. |
| Analytics | Tests cover missing data, invalid denominators, incompatible periods, supplier ranks, shares, and movement rules. |
| Explanation | Gemini explains stored results in the UI. Model failures leave the dashboard usable. |
| MVP user testing | A researcher can select a supported product, destination, and period range and complete the workflow on real multi-year data. Source and limits are visible and figures trace back to observations. |
| Monitoring | Add accounts, watchlists, recurring refresh, and alerts after the research workflow is proven. |

Validate with target users by checking what decisions this replaces or informs, which
products and markets they need, how much research time they save, whether they return,
and whether monitoring or reporting is worth paying for. See [engineering instructions](AGENTS.md)
for implementation rules and the [pilot runbook](vertical-slice.md) for local setup.
