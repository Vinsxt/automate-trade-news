import { handleTradeAnalysis } from "@/lib/api/trade-analysis";

export async function POST(request: Request) {
  return handleTradeAnalysis(request);
}
