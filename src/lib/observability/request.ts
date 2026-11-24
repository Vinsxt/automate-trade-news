export interface RequestContext {
  requestId: string;
  startedAt: number;
}

export function createRequestContext(): RequestContext {
  return { requestId: crypto.randomUUID(), startedAt: Date.now() };
}

export function logApiEvent(
  event: string,
  context: RequestContext,
  details: Record<string, string | number | boolean | null>,
) {
  console.info(JSON.stringify({
    event,
    entryPoint: event.startsWith("trade_ingestion")
      ? "POST /api/admin/ingest"
      : event.startsWith("trade_analysis")
        ? "POST /api/ai/analyze"
        : "GET /api/trade",
    requestId: context.requestId,
    durationMs: Date.now() - context.startedAt,
    ...details,
  }));
}
