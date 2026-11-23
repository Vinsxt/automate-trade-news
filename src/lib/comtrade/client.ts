import { comtradeResponseSchema, type ComtradeResponse } from "./types";

const COMTRADE_PREVIEW_URL = "https://comtradeapi.un.org/public/v1/preview/C/A/HS";

export interface ComtradePreviewQuery {
  reporterCode: number;
  period: string;
  cmdCode: string;
  flowCode: string;
  maxRecords?: number;
}

export class ComtradeRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ComtradeRequestError";
  }
}

export async function fetchComtradePreview(
  query: ComtradePreviewQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<ComtradeResponse> {
  const params = new URLSearchParams({
    reporterCode: String(query.reporterCode),
    period: query.period,
    cmdCode: query.cmdCode,
    flowCode: query.flowCode,
    maxRecords: String(query.maxRecords ?? 500),
  });
  const apiKey = process.env.COMTRADE_API_KEY?.trim();
  const response = await fetchImpl(`${COMTRADE_PREVIEW_URL}?${params}`, {
    headers: apiKey ? { "Ocp-Apim-Subscription-Key": apiKey } : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new ComtradeRequestError(
      `UN Comtrade returned HTTP ${response.status}`,
      response.status,
    );
  }

  const payload: unknown = await response.json();
  return comtradeResponseSchema.parse(payload);
}
