import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

export interface TradeExplanation {
  headline: string;
  summary: string;
  observations: string[];
  caveat: string;
}

export interface TradeExplanationMetrics {
  market: string;
  product: string;
  period: string;
  importValue: number | null;
  yearOverYearPct: number | null;
  suppliers: Array<{
    partnerCode: number;
    partnerIso: string | null;
    importValue: number;
    marketSharePct: number | null;
    shareChangePp: number | null;
  }>;
}

export class GeminiConfigurationError extends Error {
  constructor() {
    super("Gemini is not configured");
    this.name = "GeminiConfigurationError";
  }
}

const findingSelection = z.object({
  findings: z.array(z.string()).min(1).max(3),
}).strict();

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function evidenceStatements(metrics: TradeExplanationMetrics) {
  const statements = new Map<string, string>();
  if (metrics.importValue !== null) {
    statements.set("total", `The market recorded ${usd.format(metrics.importValue)} in imports.`);
  }
  if (metrics.yearOverYearPct !== null) {
    statements.set("growth", `Import value changed by ${decimal.format(metrics.yearOverYearPct)}% from the prior year.`);
  }
  for (const supplier of metrics.suppliers) {
    const name = supplier.partnerIso ?? `Partner code ${supplier.partnerCode}`;
    const share = supplier.marketSharePct === null
      ? ""
      : ` Its share of the world total was ${decimal.format(supplier.marketSharePct)}%.`;
    const change = supplier.shareChangePp === null
      ? ""
      : ` Its share changed by ${decimal.format(supplier.shareChangePp)} percentage points from the prior year.`;
    statements.set(`supplier-${supplier.partnerCode}`,
      `${name} supplied ${usd.format(supplier.importValue)} in imports.${share}${change}`);
  }
  return statements;
}

export function renderTradeExplanation(metrics: TradeExplanationMetrics, text: string): TradeExplanation {
  const statements = evidenceStatements(metrics);
  const { findings } = findingSelection.parse(JSON.parse(text));
  if (new Set(findings).size !== findings.length) {
    throw new Error("Gemini returned duplicate findings");
  }
  const observations = findings.map((id) => {
    const statement = statements.get(id);
    if (!statement) throw new Error("Gemini selected an unavailable finding");
    return statement;
  });
  return {
    headline: `${metrics.market} import findings`,
    summary: `${metrics.product} · ${metrics.period} · destination-reported imports in USD.`,
    observations,
    caveat: "Import value does not establish physical volume or the cause of a change. Missing comparisons are unavailable. Source UN Comtrade.",
  };
}

export async function generateTradeExplanation(metrics: TradeExplanationMetrics): Promise<TradeExplanation> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiConfigurationError();

  const evidence = evidenceStatements(metrics);
  const ai = new GoogleGenAI({
    apiKey,
    enterprise: false,
    apiVersion: "v1beta",
    httpOptions: {
      baseUrl: "https://generativelanguage.googleapis.com/",
      retryOptions: { attempts: 1 },
    },
  });
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: JSON.stringify({ period: metrics.period, evidence: Object.fromEntries(evidence) }),
    config: {
      abortSignal: AbortSignal.timeout(25_000),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: "Choose up to three distinct evidence IDs most useful to a trade researcher, in order of relevance. Return only the structured IDs.",
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          findings: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", enum: [...evidence.keys()] } },
        },
        required: ["findings"],
      },
      temperature: 0.2,
    },
  });

  return renderTradeExplanation(metrics, response.text ?? "");
}
