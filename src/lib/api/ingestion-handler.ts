import { NextResponse } from "next/server";

import { ingestPilotData, type IngestionResult } from "@/lib/comtrade/ingest";
import { PILOT_QUERY } from "@/lib/trade/pilot";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";
import { ingestionRequestSchema } from "@/lib/validations/ingestion";
import { createRequestContext, logApiEvent } from "@/lib/observability/request";

function respond(requestId: string, body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "x-request-id": requestId } });
}

export async function handleIngestionRequest(
  request: Request,
  runIngestion: (periods: string[]) => Promise<IngestionResult> = (periods) => ingestPilotData(periods),
) {
  const context = createRequestContext();
  const adminToken = process.env.INGEST_ADMIN_TOKEN?.trim();
  const authorization = request.headers.get("authorization");

  if (!adminToken) {
    return respond(context.requestId, { error: { code: "INGESTION_NOT_CONFIGURED", message: "Ingestion is not configured" } }, 503);
  }

  let body: unknown = {};
  let formToken: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = await request.json();
    } catch {
      return respond(context.requestId, { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } }, 400);
    }
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    formToken = form.get("adminToken")?.toString() ?? null;
    const period = form.get("period")?.toString();
    body = period ? { periods: [period] } : {};
  }

  if (authorization !== `Bearer ${adminToken}` && formToken !== adminToken) {
    return respond(context.requestId, { error: { code: "UNAUTHORIZED", message: "Valid ingestion authorization is required" } }, 401);
  }

  const parsed = ingestionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return respond(context.requestId, { error: { code: "VALIDATION_ERROR", message: "Invalid ingestion request" } }, 422);
  }

  try {
    const result = await runIngestion(parsed.data.periods ?? [...PILOT_QUERY.periods]);
    logApiEvent("trade_ingestion_succeeded", context, {
      periods: result.periods.length,
      recordsReceived: result.recordsReceived,
      recordsWritten: result.recordsWritten,
      runId: result.ingestionRunId,
      statusCode: 200,
    });
    return respond(context.requestId, { data: result }, 200);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      logApiEvent("trade_ingestion_failed", context, { errorType: "database_not_configured", statusCode: 503 });
      return respond(context.requestId, { error: { code: "DATABASE_NOT_CONFIGURED", message: "Database access is not configured" } }, 503);
    }
    logApiEvent("trade_ingestion_failed", context, {
      errorType: error instanceof Error ? error.name : "unknown",
      statusCode: 500,
    });
    return respond(context.requestId, { error: { code: "INGESTION_FAILED", message: "Trade ingestion failed" } }, 500);
  }
}
