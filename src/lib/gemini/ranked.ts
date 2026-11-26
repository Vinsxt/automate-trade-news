import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { BEGINNER_CHOICES } from "../trade/beginner-brief";
import type { ExplanationModel, rankingEvidence } from "../trade/ranked-explanation";

export function createRankedGemini(apiKey: string) {
  return new GoogleGenAI({
    apiKey, enterprise: false, apiVersion: "v1beta",
    httpOptions: { baseUrl: "https://generativelanguage.googleapis.com/", retryOptions: { attempts: 1 } },
  });
}

export async function selectRankedFindings(ai: GoogleGenAI, misses: ReturnType<typeof rankingEvidence>[], model: ExplanationModel, mode: "ranked" | "beginner" | "coffee" = "ranked") {
  // Send transformed signals only. Exact values, product, market and release IDs stay local.
  const response = await ai.models.generateContent({
    model,
    contents: JSON.stringify(misses.map((row, slot) => ({
      slot, evidence: row.findings.map(({ id, signal }) => ({ id, signal })),
    }))),
    config: {
      abortSignal: AbortSignal.timeout(mode === "coffee" ? 30_000 : 55_000),
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: mode === "coffee"
        ? "Build a cautious one-year green coffee import outlook. For each slot choose exactly one direction-, one potential-, then one risk- ID. Prioritize a large importer with a positive latest signal, a market with both positive growth and Indonesian share gains if supported, and a caveat that materially qualifies the outlook. Use only supplied evidence identifiers."
        : mode === "beginner"
        ? "For each anonymous slot return IDs in this order: lead fact, qualifying fact, research question. Use only IDs in that slot. A fact cannot start with check-, and weight-gap cannot lead. If another fact has the opposite direction from the lead, use one as the qualifier. If the lead is neutral and a signal fell, qualify with a falling signal. Avoid pairing size with annual. Pick a check- question that helps a first-time exporter act on the evidence."
        : "For every slot choose the two findings most useful to an exporter comparing markets, most useful first. Return only slot numbers and evidence IDs.",
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "array", minItems: misses.length, maxItems: misses.length,
        items: { type: "object", properties: {
          slot: { type: "integer" },
          findings: { type: "array", minItems: mode === "ranked" ? 1 : 3, maxItems: 3,
            items: { type: "string", enum: mode === "coffee" ? misses.flatMap(row => row.findings.map(finding => finding.id)) : mode === "beginner" ? [...BEGINNER_CHOICES] : ["size", "growth", "share"] } },
        }, required: ["slot", "findings"] },
      },
    },
  });
  return response.text ?? "";
}
