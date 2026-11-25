# Phase 0 research — Global Trade Intelligence

Research and live checks completed **24 November 2026 (Asia/Jakarta)**. Provider limits
below are the published limits on that date. Observed API behavior and proposed project
limits are identified separately. Phase 1 starts after approval.

## Scope and conflicts

- The India solar pilot is a regression case. The release catalog is selected by the
  opportunity score. The P0 release includes ranking, drill-down, unit values, quality
  badges and methodology. Accounts, watchlists, scheduled monitoring and alerts remain
  [design only](../README.md#deferred-monitoring-design). Export is retired.
- The [pilot runbook](vertical-slice.md) describes request-time ingestion and Gemini.
  The existing dashboard also reads with the service-role key. The revised release
  moves privileged work to operator scripts or a manually dispatched job and gives
  the web app read access to published results only. The service-role key belongs only
  in operator scripts. The optional live explanation button is deferred.
- The [PRD](PRD.md) weights three of the five candidate signals. This proposal preserves
  that rule and evaluates concentration and unit-value gaps as contextual indicators.
  The five-year target begins with four HS 2022 years so 2021 can stay outside the
  comparable series. A fifth year can be added when suitable data is released.

## UN Comtrade API

| Access | Documented on 24 November 2026 | Phase 0 evidence |
| --- | --- | --- |
| Public preview | Up to 500 rows per request, without a subscription key. The endpoint docs describe a single year and commodity per request. An anonymous daily allowance was unverified. | Credential-free India requests succeeded. One subsequent call returned 429. |
| Registered Free Data API | Up to 500 calls/day, one call/second, and 100,000 records/call. Obtain a Free subscription key from the developer portal. Treat provider limits as ceilings that can be temporarily adjusted. | The final-data endpoint returned 401 without credentials. Authenticated success, effective project quotas, quota-reset time and truncation behavior remain unverified. |

Sources from 24 November 2026. [API documentation](https://comtrade.un.org/en/api-docs) · [Subscription limits](https://comtrade.un.org/en/subscriptions) · [Key acquisition](https://uncomtrade.org/docs/api-subscription-keys/) · [Final Data API and examples](https://uncomtrade.org/docs/un-comtrade-api/) · [Fair use](https://uncomtrade.org/docs/policy-on-comtrade-data-use/)

**Query verified with live preview.** Use
`GET /public/v1/preview/C/A/HS?reporterCode=699&period=2025&cmdCode=854142&flowCode=M`
on `https://comtradeapi.un.org`. `C` is merchandise, `A` is annual, and `M` is
imports. Reporter 699 is India, the importing destination. Omitting `partnerCode`
returned suppliers plus World. Adding `partnerCode=0` selected World alone. The
samples also sent `maxRecords=500`. The official wrapper uses `maxRecords`, and
the samples did not independently prove that the preview honors an override.
Use the registered `GET /data/v1/get/C/A/HS` for the batch. UN Comtrade documents
the `subscription-key` query parameter for this route. Keep the authenticated URL
out of logs, and verify header-based authentication separately before relying on
it. Prove that the keyed request returns the expected dimensions and coverage
before expanding. The budget assumes one product, reporter and year per call.
[UN Comtrade API wrapper](https://github.com/uncomtrade/comtradeapicall/blob/main/src/comtradeapicall/PreviewGet.py) · [Registered endpoint example](https://uncomtrade.org/docs/un-comtrade-api/)

**References and edition.** Reporter codes identify the country reporting its flows.
Partner codes identify the other side and include groups such as World (0). Indonesia
is 360. Resolve codes and descriptions using the versioned reference files, since
optional response descriptions can be null. The HS request returned
`classificationSearchCode=HS` and `classificationCode=H6` (HS 2022). The documented
explicit `H6` preview path returned 500 for the same slice. Use the verified `HS`
preview and inspect each row's actual edition. Confirm behavior separately on the
keyed route. Accept H6 only for this cohort, record `isOriginalClassification` and
check conversion comparability before including converted rows. [Reporters and partners](https://uncomtrade.org/docs/reporters-and-partners/) · [Reporter JSON](https://comtradeapi.un.org/files/v1/app/reference/Reporters.json) · [Partner JSON](https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json) · [HS 2022 JSON](https://comtradeapi.un.org/files/v1/app/reference/H6.json)

**Values and flags.** Use `primaryValue` in USD for trade value while preserving
`cifvalue` and `fobvalue` and the reporting basis. Use `netWgt` in kilograms for
unit value. `qty` and `altQty` have separate unit codes and estimation flags.
Preserve `isReported`, `isAggregate`, `legacyEstimationFlag`, and weight/quantity
estimation flags as provenance. A World row can have `isAggregate=true` and
`isReported=false`; these flags alone do not make a row missing or tell whether
the partner is a country. Preserve customs, transport and second-partner dimensions.
The pilot totals slice saw `partner2Code=0`, `customsCode=C00`, `mosCode="0"` and
`motCode=0`. Check those dimensions in each response and avoid double counting.
[Comtrade methodology](https://comtrade.un.org/data/MethodologyGuideforComtradePlus.pdf) · [Quantity and weight interpretation](https://uncomtrade.org/docs/how-should-i-interpret-and-use-quantity-data-in-un-comtrade/)

**Missing versus zero.** A successful empty response or absent partner row leaves
the value unknown. A failed request remains a failure and is eligible for retry.
A null weight remains missing. Zero quantity can be a placeholder and cannot be
used as a denominator. Only an explicit, valid zero trade value can yield zero
share. Check HTTP status and the envelope's error field before interpreting `data`.
An empty slice does not establish whether a source year is unpublished, a product
is unreported or the selection is unavailable. Check availability and metadata
before assigning a reason. [Availability and metadata endpoints](https://comtrade.un.org/en/api-docs) · [Quantity guidance](https://uncomtrade.org/docs/how-should-i-interpret-and-use-quantity-data-in-un-comtrade/)

### Sanitized response shapes

Calls made on 24 November 2026 without a key. The table preserves observed statuses,
field shapes and counts only. Raw observations and trade values are omitted.

| Variation from the India query | Status | Observed shape |
| --- | --- | --- |
| 2025, partner omitted | 200 | `{elapsedTime, count: 24, data: [24 rows], error}`. All H6, 24 distinct partners, one World row, Indonesia present. |
| 2025, `partnerCode=0` | 200 | Same envelope, `count: 1`, one World row. |
| 2021, partner omitted | 429, then 200 on one later retry | Throttle body contained `statusCode` and `message`. Later success had `count: 0`, `data: []` and string `error`. |
| 2025, explicit `/C/A/H6` | 500 | Error envelope contained `error` and `details`. |
| 2025, final endpoint without key | 401 | Error envelope contained `statusCode` and `message`. |

Selected fields of the World row, with observed types shown for redacted measures:

```text
{ typeCode: "C", freqCode: "A", period: "2025", reporterCode: 699,
  partnerCode: 0, partner2Code: 0, flowCode: "M", cmdCode: "854142",
  classificationSearchCode: "HS", classificationCode: "H6",
  isOriginalClassification: true, customsCode: "C00", mosCode: "0", motCode: 0,
  primaryValue: <number>, cifvalue: <number>, fobvalue: null,
  qtyUnitCode: <number>, qty: <number>, altQtyUnitCode: <number>, altQty: <number>,
  netWgt: null, grossWgt: <number>, isNetWgtEstimated: false,
  isReported: false, isAggregate: true }
```

## Public demo and attribution

The UNSD re-dissemination guidance lists free visualization and analytics
applications as exempt and recognizes calculations such as growth and shares as
transformed outputs. It treats unchanged records and format-only transformations
as re-dissemination and distinguishes extraction APIs from analytics apps.
The general license still restricts redistribution subject to applicable exceptions.
Keep the demo free and unmonetized, show the intended derived indicators with
**Source: UN Comtrade**, retain source identification, and keep raw observations,
evidence payloads, and exports private. Bounded source values in charts should
remain part of the analytics presentation. Confirm with UNSD if the final mix
of displayed source values, API responses, or operating model is unclear. The
Phase 0 findings do not establish whether sending Comtrade-derived evidence to
a third-party model on its free tier is covered. Use synthetic evidence for
provider checks until that use and Google's data handling are confirmed.
[UNSD re-dissemination guidance](https://uncomtrade.org/docs/re-dissemination-of-data/) · [Data use and citation](https://uncomtrade.org/docs/policy-on-comtrade-data-use/) · [License agreement §5](https://comtrade.un.org/en/license-agreement) · [Gemini pricing and data handling](https://ai.google.dev/gemini-api/docs/pricing)

## Supabase and Gemini

- **Supabase Free.** 500 MB database per project. Nano defaults are 60 direct
  Postgres connections, 200 pooler client connections and default pool size 15.
  The pooler shares a limited number of database connections across clients.
  Free projects can pause after seven days of insufficient activity. Budget
  tables, indexes and retained revisions together. Use a proposed 350 MB stop
  before large backfills, based on measured size rather than row count alone.
  [Pricing](https://supabase.com/pricing) · [Compute and connections](https://supabase.com/docs/guides/platform/compute-and-disk) · [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- **Gemini.** Google lists `gemini-3.5-flash-lite` with free standard text input
  and output and support for structured output using a subset of JSON Schema.
  Google measures RPM, input TPM and RPD per project. RPD resets at midnight
  Pacific. The deployed project's numeric allowances were **unverified** in
  Phase 0. Read active Free limits in AI Studio before generating and use the
  lower of those quotas and the proposed application cap of 20 attempts per
  quota day. If limits are unknown or exhausted, use the template. Google
  indicates Free-tier content may be used to improve its products.
  [Model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) · [Pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite) · [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) · [Structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- **Explanation contract.** Hash canonical evidence including periods, scale,
  units, caveats and method version. Version the model and prompt for cache reuse.
  Give Gemini approved evidence IDs to select, validate the response in Zod,
  and render figures from the matched evidence. Record pass/fail and the reason
  for failures. Use a deterministic template for misses and failures. Leave the
  database writer and provider keys with the operator. The web app queries only
  published summaries and makes zero runtime model calls.

## Candidate pool and opportunity score

**Proposed manifest.** The 12 HS6 codes below cover products across seven Indonesian
export sectors. Two credential-free preview calls returned positive Indonesia-reported
exports to World for every listed code in 2024 under H6. The calls each returned six
codes, although the preview documentation specifies a one-commodity maximum. Treat
the observation as screening evidence and use separate documented requests for any
repeatable verification. The product codes and destination codes were also checked
against the live reference files on 24 November 2026.

| Sector | HS6 and short labels |
| --- | --- |
| Palm oil | 151110 crude palm oil, 151190 other palm oil and fractions |
| Coffee | 090111 unroasted, non-decaffeinated coffee |
| Cocoa | 180400 cocoa butter, fat and oil, 180500 unsweetened cocoa powder |
| Rubber and tyres | 400122 technically specified natural rubber, 401110 new passenger-car tyres |
| Footwear | 640399 other leather-upper footwear, 640411 textile-upper sports footwear |
| Furniture | 940360 other wooden furniture |
| Apparel | 610910 knitted cotton T-shirts and vests, 620342 men's or boys' woven cotton trousers and related garments |

Start with Australia (36), China (156), Germany (276), India (699), Japan (392),
Netherlands (528), Singapore (702), United Arab Emirates (784), United Kingdom
(826) and United States (842). These are a proposed geographically varied set
of destination reporters, with established re-export hubs included for contrast.
They are a candidate set, and their inclusion says nothing about opportunity.
Flag hub exposure and ask exporters which markets they would realistically
serve before expanding the catalog. Keep the 2025 reference year fixed in the first
ranking, using 2022–2025. Evaluate 2026 for a later release once annual
reporting is sufficiently complete for the candidate cohort.

| Score component | Weight | Measure |
| --- | --- | --- |
| Market size | 1/3 | Destination World imports in USD at end year T. |
| Three-year import growth | 1/3 | `100 × ((World[T] / World[T−3])^(1/3) − 1)`. |
| Indonesia share gain | 1/3 | `share[T] − share[T−3]` in percentage points, where `share[t] = 100 × imports from Indonesia[t] / World[t]`. |

Within each product, ascending-rank each component across eligible destinations
at the same end year and HS edition. Assign average ranks for ties. Transform
each rank into points with `100 × (rank − 1)/(eligible count − 1)` and average
the three components. Rank by full-precision score descending. Display the top
three destinations per product and include exact cutoff ties. Show raw component
values, percentile points, coverage, cohort size and method version. With fewer
than two eligible destinations, show evidence with an Unranked status. Scores
from different products or snapshots use different comparison groups.

**Minimum score coverage.** Require one comparable and finite positive World
total for each of the four annual periods, plus an explicit finite, non-negative
Indonesia import value at both endpoints. Reject numerator values above the matching
denominator. An explicit reported zero can enter the calculation. Missing partner
rows, mismatched editions, unverified conversions or duplicate totals produce an
exclusion reason. Preserve missing values throughout. YoY changes use consecutive
years and `100 × (current − prior)/prior` with a positive prior denominator.
Compare destination-reported imports against destination-reported World totals
with matching reporter, commodity, edition, year and aggregation dimensions.

**Context indicators.** Give absolute Indonesian share, concentration and the
unit-value gap zero score weight for v1. The share trend already reflects Indonesia's
foothold, and a low share can have several explanations. Calculate concentration as
`10,000 × Σ(partner value / sum of eligible partner values)^2` only for a
non-overlapping country breakdown whose valid sum is within 5% of a positive World
total. Show its coverage. Calculate unit value as USD divided by positive observed
net kilograms for the same rows. Exclude estimated weights from v1 comparisons.
When combining rows, require usable weights for at least 80% of comparable value.
Compare Indonesia with individual named suppliers for the same slice and report
`100 × (Indonesia USD/kg / competitor USD/kg − 1)` only with a positive comparator.
Pool by sums of matching values and weights, rather than averaging row ratios.
Use a limited weight coverage badge when the comparison fails. The 5% and 80%
checks are proposed thresholds for validation. Unit value reflects mix and
valuation and cannot establish product quality, profitability or a causal advantage.

## Batch budget and rollout

| Work | Expected first attempts |
| --- | ---: |
| Indonesian product validation, if repeated as one product per call | 12 |
| Initial coverage, 12 codes × 10 markets × 4 years | 480 |
| Five-year coverage once the fifth period is available | 600 across all five years, or 120 incremental calls |
| Initial total with validation | 492 now, 612 at full five-year coverage |

The estimates assume a single final-data request yields an untruncated reporter,
product and year slice. Reconcile the returned record count and dimensions
against the request. Treat capped responses as incomplete and budget any additional
requests needed to resolve them. With about 200 partners plus World per slice,
the five-year baseline is approximately 120,600 rows before extra dimensions
and revisions. This fits the proposed row guardrail. Database byte fit requires
measurement on a representative load.

Use one in-flight Comtrade request, at least 1.1 seconds between request starts,
and a project cap of 250 attempts per provider quota day including retries and
ancillary calls. Plan up to 200 new slices per day and reserve the balance for
validation, metadata, and retries. The initial backfill fits in three quota days
under that plan. A full five-year backfill also fits in three quota days if the
extra calls stay within the daily reserves. Start with a small authenticated
probe before scheduling larger days. Honor rate-limit responses including
`Retry-After` when supplied. Checkpoint by query, stop on exhausted allowance,
and resume missing slices on a later day without advancing a failed checkpoint.
Proposed bounds are 50,000 admitted observation rows per day, 250,000 retained
source rows, and a 350 MB storage guardrail. Measure representative table and
index size early and check the configured limits before each batch.

Generate explanations only for the published shortlist, normally up to 36
pairs before ties. At 20 attempts per quota day this takes at least two days
if every pair needs its first generation. Cache hits reduce calls. Extra ties,
provider throttling or lower account allowances extend the schedule. Publish
deterministic explanations for pending or failed generations. Track pass rate
as validated new generations divided by attempted generations and report
fallback and cache counts separately.

## Risks and open questions before the next phase

- **Registered API behavior.** Confirm key access, World and country coverage,
  selected dimensions, record caps, quota reset time and metadata behavior with
  a small keyed probe before planning the full backfill. Phase 0 used credential-free
  requests only.
- **Comparability and selection bias.** Verify converted H6 comparability before
  accepting a converted observation. Measure how many destinations qualify for each
  product and benchmark selection with exporters, especially when strict Indonesia
  coverage omits untapped markets. Publish the screened cohort and exclusion reasons.
- **Public display and provider use.** Review the final analytics display against
  UNSD's published exemption and document the result. Confirm permitted evidence
  handling and account data-use settings before sending source-derived evidence to
  Gemini. Synthetic provider checks and local fallback remain available.
- **Free-tier operations.** Record the active model quotas before generation and
  measure Supabase size with indexes and retained revisions. The pilot's current
  request-time integrations and privileged dashboard reader are migration work.
  Publish a dated snapshot that remains available through an upstream or model
  failure. Free-project inactivity can still affect availability.
