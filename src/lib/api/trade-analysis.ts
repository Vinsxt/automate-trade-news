import { NextResponse } from "next/server";

import { generateTradeExplanation, GeminiConfigurationError } from "@/lib/gemini/explanation";
import type { TradeExplanationMetrics } from "@/lib/gemini/explanation";
import { logApiEvent, createRequestContext } from "@/lib/observability/request";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";
import { getPilotDashboardData, type PilotDashboardData } from "@/lib/trade/dashboard";
import { PILOT_QUERY } from "@/lib/trade/pilot";
import { analysisRequestSchema } from "@/lib/validations/analysis";

interface AnalysisDependencies {
  loadDashboard: () => Promise<PilotDashboardData>;
  generate: (metrics: TradeExplanationMetrics) => ReturnType<typeof generateTradeExplanation>;
}

function explanationMetrics(dashboard: PilotDashboardData, period: string): TradeExplanationMetrics | null {
  const annual = dashboard.imports.find((item) => item.period === period);
  if (!annual || annual.importValue === null) return null;
  const suppliers = dashboard.supplierYears[period] ?? [];

  return {
    market: PILOT_QUERY.reporterName,
    product: `HS ${PILOT_QUERY.cmdCode} · ${PILOT_QUERY.classificationLabel} · ${PILOT_QUERY.productName}`,
    period,
    importValue: annual.importValue,
    yearOverYearPct: annual.yearOverYearPct,
    suppliers: suppliers.slice(0, 5).map((supplier) => ({
      partnerCode: supplier.partnerCode,
      partnerIso: supplier.partnerIso && /^[A-Z]{3}$/.test(supplier.partnerIso) ? supplier.partnerIso : null,
      importValue: supplier.importValue,
      marketSharePct: supplier.marketSharePct,
      shareChangePp: supplier.shareChangePp,
    })),
  };
}

const defaultDependencies: AnalysisDependencies = {
  loadDashboard: getPilotDashboardData,
  generate: generateTradeExplanation,
};

export async function handleTradeAnalysis(
  request: Request,
  dependencies: AnalysisDependencies = defaultDependencies,
) {
  const context = createRequestContext();
  const respond = (body: unknown, status: number) =>
    NextResponse.json(body, { status, headers: { "x-request-id": context.requestId } });
  const adminToken = process.env.INGEST_ADMIN_TOKEN?.trim();
  if (!adminToken) {
    logApiEvent("trade_analysis_failed", context, { errorType: "admin_token_not_configured", statusCode: 503 });
    return respond({ error: { code: "ANALYSIS_NOT_CONFIGURED", message: "Analysis is not configured" } }, 503);
  }
  if (request.headers.get("authorization") !== `Bearer ${adminToken}`) {
    logApiEvent("trade_analysis_rejected", context, { statusCode: 401 });
    return respond({ error: { code: "UNAUTHORIZED", message: "Valid workspace authorization is required" } }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } }, 400);
  }
  const parsed = analysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return respond({ error: { code: "VALIDATION_ERROR", message: "Select an available annual period" } }, 422);
  }

  let dashboard: PilotDashboardData;
  try {
    dashboard = await dependencies.loadDashboard();
  } catch (error) {
    const configured = !(error instanceof SupabaseConfigurationError);
    const statusCode = configured ? 500 : 503;
    logApiEvent("trade_analysis_failed", context, { errorType: configured ? "database_error" : "database_not_configured", statusCode });
    return respond({
      error: {
        code: configured ? "TRADE_DATA_UNAVAILABLE" : "DATABASE_NOT_CONFIGURED",
        message: configured ? "Trade data could not be loaded" : "Database access is not configured",
      },
    }, statusCode);
  }

  const period = parsed.data.period ?? dashboard.imports.findLast(({ importValue }) => importValue !== null)?.period;
  if (!period) {
    return respond({ error: { code: "PERIOD_UNAVAILABLE", message: "No import data is available to explain" } }, 422);
  }
  const metrics = explanationMetrics(dashboard, period);
  if (!metrics) {
    return respond({ error: { code: "PERIOD_UNAVAILABLE", message: "No import data is available for that year" } }, 422);
  }

  try {
    const explanation = await dependencies.generate(metrics);
    logApiEvent("trade_analysis_succeeded", context, { period: metrics.period, statusCode: 200 });
    return respond({ data: { period: metrics.period, explanation } }, 200);
  } catch (error) {
    const isConfigurationError = error instanceof GeminiConfigurationError;
    logApiEvent("trade_analysis_failed", context, {
      errorType: isConfigurationError ? "gemini_not_configured" : error instanceof Error ? error.name : "unknown",
      providerStatus: error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : null,
      period,
      statusCode: isConfigurationError ? 503 : 502,
    });
    return respond({
      error: {
        code: isConfigurationError ? "GEMINI_NOT_CONFIGURED" : "ANALYSIS_FAILED",
        message: isConfigurationError ? "Gemini is not configured" : "Trade explanation could not be generated",
      },
    }, isConfigurationError ? 503 : 502);
  }
}
