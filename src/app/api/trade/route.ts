import { connection, NextResponse } from "next/server";

import { getPilotDashboardData } from "@/lib/trade/dashboard";
import { SupabaseReaderConfigurationError } from "@/lib/supabase/reader";
import { createRequestContext, logApiEvent } from "@/lib/observability/request";
import { tradeSelectionSchema } from "@/lib/validations/trade-selection";

export async function GET(request: Request) {
  await connection();
  const context = createRequestContext();
  try {
    const params = new URL(request.url).searchParams;
    const selection = tradeSelectionSchema.safeParse(
      Object.fromEntries([...new Set(params.keys())].map((key) => {
        const values = params.getAll(key);
        return [key, values.length === 1 ? values[0] : values];
      })),
    );
    if (!selection.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Choose a supported product, market, and year range" } },
        { status: 422, headers: { "x-request-id": context.requestId } },
      );
    }
    const data = await getPilotDashboardData(selection.data);
    logApiEvent("trade_dashboard_loaded", context, { observationCount: data.observationCount, statusCode: 200 });
    return NextResponse.json({ data }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    if (error instanceof SupabaseReaderConfigurationError) {
      logApiEvent("trade_dashboard_failed", context, { errorType: "database_not_configured", statusCode: 503 });
      return NextResponse.json(
        { error: { code: "DATABASE_NOT_CONFIGURED", message: "Database access is not configured" } },
        { status: 503, headers: { "x-request-id": context.requestId } },
      );
    }
    logApiEvent("trade_dashboard_failed", context, {
      errorType: error instanceof Error ? error.name : "unknown",
      statusCode: 500,
    });
    return NextResponse.json(
      { error: { code: "TRADE_DATA_UNAVAILABLE", message: "Trade data could not be loaded" } },
      { status: 500, headers: { "x-request-id": context.requestId } },
    );
  }
}
