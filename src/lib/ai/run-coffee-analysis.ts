import { createRankedGemini, selectRankedFindings } from "../gemini/ranked";
import { COFFEE_HS6, coffeeOutlookEvidence, coffeeOverview, fallbackCoffeeOutlook } from "../trade/coffee-outlook";
import { EXPLANATION_MODEL, EXPLANATION_MODELS, traceBatch } from "../trade/ranked-explanation";
import { readRankedImportSeries, readRankedRelease } from "../trade/ranked-reader";
import { resolveCoffeeAnalysis, type CoffeeAnalysisView } from "./coffee-analysis";
import { coffeeAnalysisStore } from "./coffee-analysis-store";

export async function runCoffeeAnalysis(snapshotId?: string, dailyCap = Number(process.env.COFFEE_AI_DAILY_CAP ?? 1)):
  Promise<{ result: CoffeeAnalysisView } | { status: 404 | 422; message: string }> {
  const model = EXPLANATION_MODELS.find(name => name === (process.env.TRADE_EXPLANATION_MODEL || EXPLANATION_MODEL));
  if (!model || !Number.isInteger(dailyCap) || dailyCap < 1 || dailyCap > 20) throw new Error("Invalid coffee analysis configuration");
  const latest = await readRankedRelease(COFFEE_HS6);
  const release = !snapshotId || snapshotId === latest?.id ? latest : await readRankedRelease(COFFEE_HS6, snapshotId);
  if (!release) return { status: 404, message: "This green coffee release is unavailable." };
  const overview = coffeeOverview(release.ranking, await readRankedImportSeries(release.id));
  const evidence = coffeeOutlookEvidence(overview, model);
  if (!evidence.findings.length) return { status: 422, message: "This release does not have enough data for an outlook." };

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const log = (event: string, durationMs?: number) => console.info(JSON.stringify({
    event: `coffee_analysis_${event}`, ...(durationMs === undefined ? {} : { durationMs }),
  }));
  try {
    const result = await resolveCoffeeAnalysis({
      evidence, snapshot: release.id, allowGenerate: release.id === latest?.id && Boolean(apiKey),
    }, coffeeAnalysisStore(dailyCap), async input => {
      if (!apiKey) throw new Error("Gemini is unavailable");
      const slot = { hash: input.key, period: input.period, findings: input.findings };
      const raw = await selectRankedFindings(createRankedGemini(apiKey), [slot], model, "coffee");
      try {
        return traceBatch([slot], raw)[0];
      } catch {
        return []; // Let the resolver record invalid content without caching it.
      }
    }, undefined, log);
    return { result };
  } catch {
    log("analysis_unavailable");
    return { result: { state: "data", generatedAt: null, coverage: evidence.period, sections: fallbackCoffeeOutlook(evidence) } };
  }
}
