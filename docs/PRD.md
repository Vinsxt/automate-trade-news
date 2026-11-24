# Global Trade Intelligence PRD

**Product decision** — Help an Indonesian exporter choose which destination markets
to investigate for a product they already sell. A trade researcher preparing that
shortlist for a client is a second target user. The current [India solar pilot](vertical-slice.md)
demonstrates the drill-down. The ranked shortlist and published snapshots below are the next release.

## The research workflow

1. Choose an HS6 product. See its description, edition, the markets screened, and the
   date of the published snapshot. Start with the highest-ranked eligible destinations.
2. Compare each pair’s score components, coverage, and limitations. Open a result to
   see import trends, suppliers, and Indonesia’s position for the same snapshot.
3. Inspect a surprising figure or a missing comparison. Follow its definition, period,
   unit, and source reference. Leave with a destination to investigate and a reason
   that can be checked by a colleague.

**Validation.** Ask exporters to bring a product and a recent market-selection task.
Record how long their existing workflow takes. Observe whether they can build and
justify a shortlist unaided, recognize a result with poor coverage, and say which
market they would research next. Follow up to learn whether they used the result in
an actual market brief or decision. Use that evidence to revise the score and catalog.

## Coverage and ranking method

Start the candidate pool with 10–15 HS6 products with documented Indonesian exports
and 8–12 destination markets, targeting five annual periods where available. Record
the inclusion rationale, source and edition for each product and the basis for including
each destination. Screen every candidate pair. Publish the top eligible results per
product, alongside counts of screened, eligible, and excluded markets and the reasons
for exclusion. The pilot pairing is a regression case. Its place on a shortlist must
come from the same rule as any other pair.

**Proposed score v1.** For a product, compare destinations at a common end year in
one HS edition. Use the following equally weighted components as an initial hypothesis.

| Component | Input | Direction |
| --- | --- | --- |
| Market size | Destination-reported world import value in USD in the end year | Larger ranks higher |
| Sustained import value growth | Three-year compound annual growth, `(end / start)^(1/3) − 1`, using four consecutive annual world totals and a positive start value | Faster growth ranks higher |
| Indonesia’s position | End-year Indonesian share minus its share three years earlier, in percentage points | Larger gains rank higher |

For each component assign a percentile within eligible destinations for that product:
100 × (ascending rank − 1) / (eligible count − 1), using average ranks for ties. The
opportunity score is the mean of those three percentiles. Show raw inputs, component
points, weights, cohort size, and method version. Apply the shortlist cutoff after
scoring; include ties at the cutoff. With fewer than two eligible destinations, show
available evidence and withhold the ranking. Scores from different product cohorts
have different comparison sets.

For example, among five eligible destinations, a market ranked fourth in size,
fifth in growth, and third in Indonesian share gain earns 75, 100, and 50 points.
Its score is 75/100. The breakdown lets a researcher see that growth drove its
placement and decide whether that matters for their own business.

Missing required observations, mismatched editions, incomplete required periods, or
invalid denominators make a pair ineligible. A reported zero supplier value can yield
zero share; an absent partner row leaves share unknown. This rule favors established
or emerging Indonesian suppliers and may miss untapped markets. Show supplier
concentration and unit-value gaps as drill-down context where coverage permits.
Their commercial interpretation varies by product. Validate that users value these
signals before giving them score weights. A high score prioritizes research and
carries no forecast of sales, margin, or market-entry success.

## Requirements and priorities

| ID | Priority | User-visible or operational acceptance |
| --- | --- | --- |
| FR-16 | P0 | Rank eligible product–market pairs by the published rule. Each result links to its score breakdown and drill-down in the same snapshot. |
| FR-01–03 | P0 | Select an HS product with its edition and confirmed description, an importing market, and an available historical range. Keep the ranking’s reference years visible when exploring another range. |
| FR-04–07 | P0 | Chart import value and comparable annual growth. Rank suppliers and show values, shares, changes in value, rank and share, and Indonesia’s position where reported. Show comparable quantities or weights when available. |
| FR-17 | P0 | Compare supplier unit values in USD/kg using matching import value and positive reported net weight. Show Indonesia versus named competitors with the year, units and weight coverage. |
| FR-08 | P0 | Flag movements using documented thresholds. The pilot uses absolute changes of 20% in annual market value or five percentage points in supplier share. |
| FR-10, FR-18 | P0 | Put source, period, publication date and a quality badge on each result. Explain the edition check, missing versus zero, period coverage and usable weights. Link to a methodology page with a worked score and an exclusion example. |
| FR-09 | P0 | Serve a stored, validated explanation for its evidence or a deterministic summary from the same indicators. Label the fallback. |
| FR-11 | P0 | Trace every published indicator and explanation to a snapshot, calculation version, observations, and retrieval runs. Retry failed batches safely. |
| FR-12–14 | Design only | Document accounts, private watchlists, scheduled monitoring, and threshold alerts for a later decision on repeat usage. |
| FR-15 | Retired | Summary and raw-data export are outside the product scope. |

A static Bahasa Indonesia interface is optional. Validate terminology with target
users before translating. Build for desktop research and mobile review, including
clear loading, unavailable, stale, and error states.

## Interpretation and release criteria

- Use destination-reported imports by partner. Use the matching source world total
  as the share denominator. Separate mirror exports and require explicit concordance
  for edition changes. Preserve source flags, units, dimensions and retrieval times.
- Use consecutive years and a positive prior value for year-over-year growth. Use
  percentage points for changes in share. For aggregated unit values, divide the sum
  of values by the sum of weights for the same usable rows. Disclose the share of value
  covered and suppress comparisons with incompatible units or insufficient coverage
  under the published method. Unit value can change with product mix and valuation.
- The methodology page must explain candidate selection bias, missing reports, revisions,
  the difference between publication date and trade year, and limits of country-level
  statistics for identifying firms or inferring causes.
- Use a text badge with drill-down reasons. An edition mismatch or missing score
  input means **Unranked**. Missing comparable weights on an otherwise rankable
  pair means **Limited weight coverage** and suppresses the affected unit-value
  comparison. Show **Comparable** only for the indicators whose checks passed.
- Before public release, verify permission to display the intended derived indicators
  and narratives with attribution under the applicable UN Comtrade terms. Record the
  review and resolve uncertainty before publishing.
- Release evidence includes a reproducible ranked snapshot, tests for zero, missing,
  edition mismatch, ranking ties and invalid weight, and an end-to-end trace from a
  displayed result to source rows. Publish the explanation claim-tracing pass rate
  and fallback count. Verify readers can use the last published snapshot through a
  failed refresh or model outage. See the [target architecture](architecture.md).
