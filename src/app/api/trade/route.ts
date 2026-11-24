import { connection, NextResponse } from "next/server";

import { getPilotDashboardData } from "@/lib/trade/dashboard";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";
import { createRequestContext, logApiEvent } from "@/lib/observability/request";

export async function GET() {
  const context = createRequestContext();
  try {
    await connection();
    const data = await getPilotDashboardData();
    logApiEvent("trade_dashboard_loaded", context, { observationCount: data.observationCount, statusCode: 200 });
    return NextResponse.json({ data }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
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
