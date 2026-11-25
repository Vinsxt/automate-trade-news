export const OPPORTUNITY_METHOD = "opportunity-v1";

export interface OpportunityCandidate {
  reporter: number;
  hs6: string;
  edition: string;
  observations: {
    year: number;
    partner: number;
    edition: string;
    comparable: boolean;
    value: number | null;
  }[];
}

type Components = { marketSize: number; importGrowth: number; indonesiaShareGain: number };
type Exclusion = "incomparable_observation" | "duplicate_observation" | "missing_world" | "invalid_world" |
  "missing_indonesia" | "invalid_indonesia" | "insufficient_cohort";
interface OpportunityResult {
  reporter: number;
  hs6: string;
  edition: string;
  referenceYear: number;
  method: string;
  components: Components | null;
  points: Components | null;
  score: number | null;
  eligibleCount: number;
  shortlisted: boolean;
  reason: Exclusion | null;
}

function measure(candidate: OpportunityCandidate, end: number): Components | Exclusion {
  const start = end - 3;
  const values = new Map<string, number | null>();
  for (const row of candidate.observations) {
    if (row.year < start || row.year > end) continue;
    if (row.partner !== 0 && (row.partner !== 360 || (row.year !== start && row.year !== end))) continue;
    if (row.edition !== candidate.edition || !row.comparable) return "incomparable_observation";
    const key = `${row.year}:${row.partner}`;
    if (values.has(key)) return "duplicate_observation";
    values.set(key, row.value);
  }

  const totals: number[] = [];
  for (let year = start; year <= end; year++) {
    const value = values.get(`${year}:0`);
    if (value == null) return "missing_world";
    if (!Number.isFinite(value) || value <= 0) return "invalid_world";
    totals.push(value);
  }

  const startValue = values.get(`${start}:360`);
  const endValue = values.get(`${end}:360`);
  if (startValue == null || endValue == null) return "missing_indonesia";
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) ||
      startValue < 0 || endValue < 0 || startValue > totals[0] || endValue > totals[3]) {
    return "invalid_indonesia";
  }

  const growthRatio = totals[3] / totals[0];
  const growthFactor = Number.isFinite(growthRatio)
    ? Math.cbrt(growthRatio)
    : Math.exp((Math.log(totals[3]) - Math.log(totals[0])) / 3);
  return {
    marketSize: totals[3],
    importGrowth: 100 * (growthFactor - 1),
    indonesiaShareGain: 100 * (endValue / totals[3] - startValue / totals[0]),
  };
}

const keys = ["marketSize", "importGrowth", "indonesiaShareGain"] as const;

export function rankOpportunities(candidates: OpportunityCandidate[], referenceYear: number): OpportunityResult[] {
  if (!Number.isInteger(referenceYear)) throw new Error("Reference year must be an integer");
  const cohorts = new Map<string, OpportunityResult[]>();
  const pairs = new Set<string>();
  for (const candidate of candidates) {
    const { reporter, hs6, edition } = candidate;
    const key = `${edition}:${hs6}`;
    const pair = `${key}:${reporter}`;
    if (pairs.has(pair)) throw new Error("Duplicate opportunity candidate");
    pairs.add(pair);
    const cohort = cohorts.get(key) ?? [];
    const outcome = measure(candidate, referenceYear);
    cohort.push({
      reporter, hs6, edition, referenceYear, method: OPPORTUNITY_METHOD,
      components: typeof outcome === "string" ? null : outcome,
      reason: typeof outcome === "string" ? outcome : null,
      points: null, score: null, eligibleCount: 0, shortlisted: false,
    });
    cohorts.set(key, cohort);
  }

  const results: OpportunityResult[] = [];
  for (const cohort of cohorts.values()) {
    const eligible = cohort.filter(row => row.components !== null);
    for (const row of cohort) row.eligibleCount = eligible.length;
    if (eligible.length < 2) {
      for (const row of eligible) row.reason = "insufficient_cohort";
      results.push(...cohort);
      continue;
    }

    const doubledRanks = new Map(eligible.map(row => [row, { marketSize: 0, importGrowth: 0, indonesiaShareGain: 0 }]));
    for (const key of keys) {
      const ordered = eligible.toSorted((a, b) => a.components![key] - b.components![key]);
      for (let first = 0; first < ordered.length;) {
        let next = first + 1;
        while (next < ordered.length && ordered[next].components![key] === ordered[first].components![key]) next++;
        for (const row of ordered.slice(first, next)) doubledRanks.get(row)![key] = first + next - 1;
        first = next;
      }
    }

    const denominator = 2 * (eligible.length - 1);
    for (const row of eligible) {
      const rank = doubledRanks.get(row)!;
      row.points = {
        marketSize: 100 * rank.marketSize / denominator,
        importGrowth: 100 * rank.importGrowth / denominator,
        indonesiaShareGain: 100 * rank.indonesiaShareGain / denominator,
      };
      row.score = 100 * (rank.marketSize + rank.importGrowth + rank.indonesiaShareGain) / (3 * denominator);
    }
    eligible.sort((a, b) => b.score! - a.score! || a.reporter - b.reporter);
    const cutoff = eligible[Math.min(2, eligible.length - 1)].score!;
    for (const row of eligible) row.shortlisted = row.score! >= cutoff;
    results.push(...eligible, ...cohort.filter(row => row.components === null));
  }
  return results;
}
