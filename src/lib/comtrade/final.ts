import { setTimeout as sleep } from "node:timers/promises";

import { ComtradeRequestError, type ComtradePreviewQuery } from "./client";
import { comtradeResponseSchema } from "./types";

const limit = 500;

export async function fetchComtradeFinal(
  query: ComtradePreviewQuery,
  reserveAttempt: () => Promise<void>,
  fetchImpl: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = sleep,
) {
  return fetchComtradeFinalGroup(query, [query.cmdCode], reserveAttempt, fetchImpl, wait);
}

export async function fetchComtradeFinalGroup(
  query: Omit<ComtradePreviewQuery, "cmdCode">,
  products: readonly string[],
  reserveAttempt: () => Promise<void>,
  fetchImpl: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = sleep,
) {
  const rowLimit = products.length === 1 ? limit : 2500;
  const key = process.env.COMTRADE_API_KEY?.trim();
  if (!key) throw new ComtradeRequestError("Configure a registered COMTRADE_API_KEY");

  const url = new URL("https://comtradeapi.un.org/data/v1/get/C/A/HS");
  url.search = new URLSearchParams({
    reporterCode: String(query.reporterCode),
    period: query.period,
    cmdCode: products.join(","),
    flowCode: query.flowCode,
    partner2Code: "0",
    customsCode: "C00",
    motCode: "0",
    maxRecords: String(rowLimit),
    "subscription-key": key,
  }).toString();

  for (let attempt = 1; ; attempt++) {
    await reserveAttempt();
    let response: Response | undefined;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(15_000), redirect: "error" });
    } catch {
      if (attempt === 3) throw new ComtradeRequestError("UN Comtrade request failed");
    }

    if (response?.ok) {
      const payload = comtradeResponseSchema.parse(await response.json());
      if (payload.error) throw new ComtradeRequestError("UN Comtrade returned an API error");
      if (payload.count !== payload.data.length || payload.data.length >= rowLimit) {
        throw new ComtradeRequestError("UN Comtrade slice is incomplete or reached its row limit");
      }
      if (payload.data.some((row) => row.partner2Code !== 0 || row.customsCode !== "C00" || row.motCode !== 0 || row.mosCode !== "0")) {
        throw new ComtradeRequestError("UN Comtrade returned unexpected aggregation dimensions");
      }
      if (payload.data.some((row) => !products.includes(row.cmdCode) || row.reporterCode !== query.reporterCode ||
        row.period !== query.period || row.flowCode !== query.flowCode || row.typeCode !== "C" || row.freqCode !== "A")) {
        throw new ComtradeRequestError("UN Comtrade returned rows outside the requested cohort");
      }
      return payload;
    }

    const status = response?.status;
    if (attempt === 3 || (status !== undefined && status !== 429 && status < 500)) {
      throw new ComtradeRequestError(`UN Comtrade request failed${status ? ` (HTTP ${status})` : ""}`, status);
    }
    const retryAfter = response?.headers.get("retry-after");
    const seconds = retryAfter && /^\d+$/.test(retryAfter)
      ? Number(retryAfter)
      : retryAfter ? (Date.parse(retryAfter) - Date.now()) / 1000 : 0;
    if (seconds > 60) throw new ComtradeRequestError("UN Comtrade requested a longer retry delay", status);
    await wait(Math.max(1100 * attempt, Number.isFinite(seconds) ? seconds * 1000 : 0));
  }
}
