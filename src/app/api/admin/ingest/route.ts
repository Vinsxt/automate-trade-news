import { NextResponse } from "next/server";

import { ingestPilotData } from "@/lib/comtrade/ingest";
import { PILOT_QUERY } from "@/lib/comtrade/normalize";
import { ingestionRequestSchema } from "@/lib/validations/ingestion";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const adminToken = process.env.INGEST_ADMIN_TOKEN?.trim();
  const authorization = request.headers.get("authorization");

  if (!adminToken) {
    return errorResponse(503, "INGESTION_NOT_CONFIGURED", "Ingestion is not configured");
  }

  if (authorization !== `Bearer ${adminToken}`) {
    return errorResponse(401, "UNAUTHORIZED", "Valid ingestion authorization is required");
  }

  let body: unknown = {};
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
    }
  }

  const parsed = ingestionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(422, "VALIDATION_ERROR", "Invalid ingestion request");
  }

  try {
    const result = await ingestPilotData(parsed.data.periods ?? [...PILOT_QUERY.periods]);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Trade ingestion failed", {
      message: error instanceof Error ? error.message : "Unknown ingestion error",
    });
    return errorResponse(500, "INGESTION_FAILED", "Trade ingestion failed");
  }
}
