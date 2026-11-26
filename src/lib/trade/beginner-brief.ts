import { createHash } from "node:crypto";
import { annualFinding, metric, usd, type BeginnerMarket } from "./beginner-market";
import type { ExplanationModel } from "./ranked-explanation";

export const BEGINNER_BRIEF_VERSION = "beginner-brief-v3";

export const BEGINNER_CHOICES = [
  "annual", "size", "growth", "share", "weight-gap",
  "check-suppliers", "check-value", "check-specification",
] as const;

type ChoiceId = typeof BEGINNER_CHOICES[number];

export function beginnerBriefEvidence(market: BeginnerMarket, model: ExplanationModel) {
  const { row, name } = market;
  const end = row.referenceYear;
  const period = `${end - 3}–${end}`;
  const latest = market.years.find(year => year.period === String(end));
  const choices: { id: ChoiceId; signal: string; text: string; values: number[]; direction: number }[] = [];
  const add = (id: ChoiceId, signal: string, text: string, values: number[] = [], direction = 0) =>
    choices.push({ id, signal, text, values, direction: Math.sign(direction) });
  const describe = (value: number) => value < 0 ? "fell" : value > 0 ? "rose" : "held steady";
  if (latest?.importValue != null && latest.annualChange !== null) {
    add("annual", `Latest annual import value ${describe(latest.annualChange)}`, annualFinding(name, latest),
      [latest.importValue, latest.annualChange], latest.annualChange);
  }
  if (latest?.importValue != null) {
    add("size", row.points ? `Import size ${row.points.marketSize >= 50 ? "above or at" : "below"} the cohort midpoint` : "Reported latest import value",
      `In ${end}, ${name} reported ${usd(latest.importValue)} in imports from all suppliers.`, [latest.importValue]);
  }
  if (row.components) {
    const { importGrowth, indonesiaShareGain } = row.components;
    add("growth", `Annualized import value ${describe(importGrowth)} over the full reference window`,
      `${name}’s import value changed by ${metric(importGrowth, "% per year", true)} over ${period}.`, [importGrowth], importGrowth);
    add("share", `Indonesia's share ${describe(indonesiaShareGain)} over the full reference window`,
      `Indonesia’s share in ${name} changed by ${metric(indonesiaShareGain, " percentage points", true)} over ${period}.`, [indonesiaShareGain], indonesiaShareGain);
  }
  if (!row.hasWeightComparison) {
    add("weight-gap", "Comparable supplier weights are limited",
      `Limited weight coverage in ${end} restricts comparisons of supplier value per kilogram.`);
  }
  if (latest?.gainingSuppliers.length && row.components && row.components.indonesiaShareGain < 0) {
    add("check-suppliers", "Investigate which supplier areas gained share when Indonesia lost share over the reference window",
      `Which supplier countries gained share from ${end - 1} to ${end}?`);
  }
  if (latest?.annualChange != null && latest.annualChange !== 0) {
    add("check-value", "Check whether prices or quantities explain a change in import value",
      "Did reported quantities move in the same direction as import value?");
  }
  add("check-specification", "Ask the exporter which product and quantity they can supply",
    "What specifications can you offer for one shipment?");
  const hash = createHash("sha256").update(JSON.stringify([
    BEGINNER_BRIEF_VERSION, model, row.hs6, row.reporter, row.edition, period,
    row.method, row.eligibleCount, market.rank, market.tied, row.reason, row.hasWeightComparison,
    market.years.map(({ period, importValue, annualChange, indonesiaShare, indonesiaChange, gainingSuppliers }) =>
      [period, importValue, annualChange, indonesiaShare, indonesiaChange, gainingSuppliers]),
    choices.map(({ id, values, signal, text }) => [id, values, signal, text]),
  ])).digest("hex");
  // Ineligible pairs and gaps use the deterministic copy, even when some facts are available.
  const completeYears = market.years.length === 4 && market.years.every(year => year.importValue !== null);
  const findings = row.score !== null && completeYears && latest?.importValue != null ? choices : [];
  return { hash, period, findings };
}

export function traceBeginnerBrief(evidence: ReturnType<typeof beginnerBriefEvidence>, submitted: unknown) {
  if (!Array.isArray(submitted) || submitted.length !== 3) throw new Error("A beginner brief needs three approved IDs");
  const [lead, qualifier, question] = submitted.map(id => evidence.findings.find(choice => choice.id === id));
  if (!lead || !qualifier || !question || lead === qualifier || lead.id === "weight-gap" ||
      lead.id.startsWith("check-") || qualifier.id.startsWith("check-") || !question.id.startsWith("check-")) {
    throw new Error("Invalid beginner brief roles");
  }
  const signals = evidence.findings.filter(choice => choice !== lead && !choice.id.startsWith("check-"));
  const contrary = signals.filter(choice => lead.direction === 0 ? choice.direction < 0 : choice.direction === -lead.direction);
  if (contrary.length && !contrary.includes(qualifier)) throw new Error("Beginner brief omitted a contrary signal");
  if ((lead.id === "size" && qualifier.id === "annual") || (lead.id === "annual" && qualifier.id === "size")) {
    throw new Error("Beginner brief repeated the same market size");
  }
  return { facts: [lead.text, qualifier.text], question: question.text };
}
