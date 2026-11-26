import { createHash } from "node:crypto";
import type { ImportYear } from "../analytics/trade";
import { metric, referenceYears, usd } from "./beginner-market";
import type { RankedRelease } from "./ranked-snapshot";
import type { ExplanationModel } from "./ranked-explanation";

export const COFFEE_HS6 = "090111";
export const COFFEE_OUTLOOK_VERSION = "green-coffee-outlook-v2";

export function coffeeOverview(ranking: RankedRelease, series: ReadonlyMap<number, Pick<ImportYear, "period" | "importValue">[]>) {
  const periods = referenceYears(ranking.referenceYear);
  const markets = ranking.rankings.flatMap(row => {
    const values = periods.map(period => series.get(row.reporter)?.find(item => item.period === period)?.importValue ?? null);
    if (!values.every((value): value is number => value !== null && Number.isFinite(value) && value >= 0)) return [];
    return [{
      reporter: row.reporter, name: row.marketName, values, total: values.reduce((sum, value) => sum + value, 0),
      latestChange: values[2] > 0 ? (values[3] / values[2] - 1) * 100 : null,
      annualGrowth: values[0] > 0 ? (Math.cbrt(values[3] / values[0]) - 1) * 100 : null,
      shareGain: row.components?.indonesiaShareGain ?? null,
    }];
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "en"));
  const cutoff = markets[2]?.total;
  return {
    markets, periods, leaders: cutoff === undefined ? markets : markets.filter(market => market.total >= cutoff),
    screened: ranking.rankings.length,
  };
}

export function coffeeOutlookEvidence(overview: ReturnType<typeof coffeeOverview>, model: ExplanationModel, promptVersion = COFFEE_OUTLOOK_VERSION) {
  const { markets, periods, leaders } = overview;
  const end = Number(periods.at(-1));
  const period = `${periods[0]}–${end}`;
  const findings = markets.flatMap((market, index) => {
    const { name, values, annualGrowth, latestChange, shareGain } = market;
    const destination = [528, 784, 826, 842].includes(market.reporter) ? `the ${name}` : name;
    const candidates: { id: string; signal: string; text: string; values: number[] }[] = [];
    if (leaders.includes(market)) candidates.push({
      id: `direction-${index}`,
      signal: `One of the largest importers by four-year total. Latest import value ${latestChange == null ? "has no comparable change" : latestChange > 0 ? "rose" : "did not rise"}.`,
      text: `If recent trade patterns persist, ${destination} could remain one of the largest covered markets in ${end + 1}. It imported ${usd(market.total)} over ${period}, including ${usd(values[3])} in ${end}.`,
      values,
    });
    if (annualGrowth !== null && annualGrowth > 0 && latestChange !== null && latestChange > 0) candidates.push({
      id: `potential-${index}`,
      signal: `Import value grew over the whole period (${annualGrowth >= 20 ? "fast" : "moderately"}) and in the latest year (${latestChange >= 20 ? "fast" : "moderately"}). Indonesia’s share ${shareGain === null ? "has no comparable change" : shareGain > 0 ? "gained" : "did not gain"}. Market is ${leaders.includes(market) ? "among the largest" : "outside the largest group"}.`,
      text: `If import growth continues, ${destination} could be worth researching. Its import value grew ${metric(annualGrowth, "% per year")} over ${period} and ${metric(latestChange, "%")} in ${end} versus ${end - 1}.` +
        (shareGain === null ? "" : ` Indonesia’s share changed by ${metric(shareGain, " percentage points", true)} over ${period}.`),
      values: [annualGrowth, latestChange, ...(shareGain === null ? [] : [shareGain])],
    });
    const prior = values[1] > 0 ? (values[2] / values[1] - 1) * 100 : null;
    if (prior !== null && latestChange !== null && Math.sign(prior) * Math.sign(latestChange) < 0) candidates.push({
      id: `risk-${index}`, signal: "Import value reversed direction across the two latest annual changes.",
      text: `Imports in ${destination} reversed direction, from ${metric(prior, "%", true)} in ${end - 1} to ${metric(latestChange, "%", true)} in ${end}. Each change is versus the prior year.`,
      values: [prior, latestChange],
    });
    return candidates;
  });
  findings.push(
    { id: "potential-check", signal: "Investigate buyers before assuming the value trend will translate into sales.", text: "Before choosing a market, check what quality and shipment sizes buyers source and whether they already buy from Indonesia.", values: [] },
    { id: "risk-value", signal: "USD values cannot separate prices from physical volumes.", text: "Rising import value can reflect higher prices, larger orders, or both. Check reported quantities and buyer demand before extrapolating.", values: [] },
  );
  const dataHash = createHash("sha256").update(JSON.stringify([
    COFFEE_HS6, "world-imports", "USD", "HS 2022", "Indonesia", periods, overview.screened,
    markets.map(market => [market.reporter, market.name, market.values, market.shareGain]),
  ])).digest("hex");
  const key = createHash("sha256").update(JSON.stringify([dataHash, promptVersion, model])).digest("hex");
  return { key, dataHash, promptVersion, model, period, end, findings: markets.length >= 3 ? findings : [] };
}

export function traceCoffeeOutlook(evidence: ReturnType<typeof coffeeOutlookEvidence>, submitted: unknown) {
  if (!Array.isArray(submitted) || submitted.length !== 3) throw new Error("Expected three outlook selections");
  return ["direction-", "potential-", "risk-"].map((prefix, index) => {
    const option = evidence.findings.find(finding => finding.id === submitted[index] && finding.id.startsWith(prefix));
    if (!option) throw new Error("Invalid outlook selection");
    return option.text;
  });
}

export function fallbackCoffeeOutlook(evidence: ReturnType<typeof coffeeOutlookEvidence>) {
  const growth = evidence.findings.filter(finding => finding.id.startsWith("potential-") && finding.values.length > 0)
    .toSorted((a, b) => Number((b.values[2] ?? 0) > 0) - Number((a.values[2] ?? 0) > 0) || b.values[0] - a.values[0]);
  const alternative = growth.find(finding => finding.id !== "potential-0") ?? growth[0];
  const risk = evidence.findings.find(finding => finding.id === "risk-0");
  return traceCoffeeOutlook(evidence, ["direction-0", alternative?.id ?? "potential-check", risk?.id ?? "risk-value"]);
}
