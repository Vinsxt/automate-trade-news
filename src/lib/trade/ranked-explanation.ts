import { createHash } from "node:crypto";
import { z } from "zod";
import type { PilotDashboardData } from "./dashboard";
import type { RankedRelease } from "./ranked-snapshot";

export const EXPLANATION_MODEL = "gemini-3.5-flash-lite";
export const EXPLANATION_VERSION = "ranked-findings-v1";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

type Finding = { id: string; signal: string; text: string; values: number[] };
type RankedMarket = RankedRelease["rankings"][number];
const direction = (n: number) => n > 0 ? "increased" : n < 0 ? "decreased" : "unchanged";

export function rankingEvidence(result: RankedMarket) {
  const { components, points } = result;
  const findings: Finding[] = components && points ? [
    { id: "size", signal: `Import size scored ${points.marketSize >= 50 ? "in the upper half" : "below the midpoint"} of the cohort scale`,
      text: `The market imported ${usd.format(components.marketSize)} in ${result.referenceYear} (size: ${decimal.format(points.marketSize)}/100).`,
      values: [components.marketSize, points.marketSize] },
    { id: "growth", signal: `Annualized import value ${direction(components.importGrowth)}`,
      text: `Annualized import growth was ${decimal.format(components.importGrowth)}% (growth: ${decimal.format(points.importGrowth)}/100).`,
      values: [components.importGrowth, points.importGrowth] },
    { id: "share", signal: `Indonesia’s share ${direction(components.indonesiaShareGain)}`,
      text: `Indonesia’s share changed by ${decimal.format(components.indonesiaShareGain)} percentage points (share change: ${decimal.format(points.indonesiaShareGain)}/100).`,
      values: [components.indonesiaShareGain, points.indonesiaShareGain] },
  ] : [];
  const period = `${result.referenceYear - 3}–${result.referenceYear}`;
  const hash = createHash("sha256").update(JSON.stringify([
    EXPLANATION_VERSION, EXPLANATION_MODEL, result.hs6, result.reporter, result.edition, period,
    result.method, result.eligibleCount, "USD, %, percentage points, percentile points",
    "relative to eligible cohort; import value is not volume or a forecast",
    findings.map(({ id, values, signal }) => [id, values, signal]),
  ])).digest("hex");
  return { hash, period, findings };
}

const selection = z.array(z.string()).min(1).max(3);

export function traceFindings(findings: Finding[], submitted: unknown) {
  const ids = selection.parse(submitted);
  const byId = new Map(findings.map(finding => [finding.id, finding.text]));
  if (new Set(ids).size !== ids.length || ids.some(id => !byId.has(id))) {
    throw new Error("Finding does not match unique approved evidence");
  }
  return ids.map(id => byId.get(id)!);
}

export function traceBatch(evidence: ReturnType<typeof rankingEvidence>[], submitted: string) {
  const results = z.array(z.object({ slot: z.number().int().nonnegative(), findings: selection }).strict())
    .length(evidence.length).parse(JSON.parse(submitted));
  const bySlot = new Map(results.map(row => [row.slot, row.findings]));
  return evidence.map(({ findings }, slot) => {
    const ids = bySlot.get(slot);
    traceFindings(findings, ids);
    return ids!;
  });
}

export function summarizeExploredYears(dashboard: PilotDashboardData) {
  const year = dashboard.imports.find(row => row.period === dashboard.latestPeriod);
  if (!year) return ["No comparable import observations are available for this range."];
  const indonesia = dashboard.latestSuppliers.find(row => row.partnerCode === 360);
  return [
    ...(year.importValue == null ? [] : [`Reported imports in ${year.period} were ${usd.format(year.importValue)}.`]),
    ...(indonesia?.marketSharePct == null ? [] : [`Indonesia supplied ${decimal.format(indonesia.marketSharePct)}% of reported imports in ${year.period}.`]),
  ].concat(year.importValue == null && indonesia?.marketSharePct == null
    ? ["Import value and Indonesia’s share are unavailable for this range."] : []);
}
