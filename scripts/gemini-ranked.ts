import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { EXPLANATION_MODEL, type rankingEvidence } from "../src/lib/trade/ranked-explanation";

export function createRankedGemini(apiKey: string) {
  return new GoogleGenAI({
    apiKey, enterprise: false, apiVersion: "v1beta",
    httpOptions: { baseUrl: "https://generativelanguage.googleapis.com/", retryOptions: { attempts: 1 } },
  });
}

export async function selectRankedFindings(ai: GoogleGenAI, misses: ReturnType<typeof rankingEvidence>[]) {
  // Send transformed signals only. Exact values, product, market and release IDs stay local.
  const response = await ai.models.generateContent({
    model: EXPLANATION_MODEL,
    contents: JSON.stringify(misses.map((row, slot) => ({
      slot, evidence: row.findings.map(({ id, signal }) => ({ id, signal })),
    }))),
    config: {
      abortSignal: AbortSignal.timeout(25_000),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: "For every slot choose the two findings most useful to an exporter comparing markets, most useful first. Return only slot numbers and evidence IDs.",
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "array", minItems: misses.length, maxItems: misses.length,
        items: { type: "object", properties: {
          slot: { type: "integer" },
          findings: { type: "array", minItems: 1, maxItems: 3,
            items: { type: "string", enum: ["size", "growth", "share"] } },
        }, required: ["slot", "findings"] },
      },
    },
  });
  return response.text ?? "";
}
