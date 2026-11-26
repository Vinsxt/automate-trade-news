import { runCoffeeAnalysis } from "@/lib/ai/run-coffee-analysis";

export const maxDuration = 60;

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request, { params }: { params: Promise<{ snapshot: string }> }) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    return Response.json({ message: "This request must come from the trade dashboard." }, { status: 403, headers });
  }
  const { snapshot } = await params;
  if (!/^[a-f0-9]{64}$/.test(snapshot)) {
    return Response.json({ message: "Invalid green coffee release." }, { status: 400, headers });
  }
  try {
    const analysis = await runCoffeeAnalysis(snapshot);
    if ("status" in analysis) return Response.json({ message: analysis.message }, { status: analysis.status, headers });
    return Response.json(analysis.result, { headers });
  } catch {
    console.info(JSON.stringify({ event: "coffee_analysis_request_failed" }));
    return Response.json({ message: "The green coffee outlook is temporarily unavailable." }, { status: 503, headers });
  }
}
