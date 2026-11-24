import { z } from "zod";

import { ComtradeRequestError } from "../src/lib/comtrade/client";
import { fetchComtradeFinal } from "../src/lib/comtrade/final";
import { ingestAnnualImports } from "../src/lib/comtrade/ingest";
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";

const args = z.tuple([z.coerce.number().int().positive(), z.string().regex(/^\d{6}$/), z.string().regex(/^20\d{2}$/)]);
const parsed = args.safeParse(process.argv.slice(2));

async function main() {
  if (!parsed.success) throw new Error("Usage: npm run ingest:trade -- <reporter> <HS6> <year>");
  const [reporterCode, cmdCode, period] = parsed.data;
  if (!process.env.COMTRADE_API_KEY?.trim()) throw new Error("Configure a registered COMTRADE_API_KEY");

  const db = createSupabaseAdminClient();
  const result = await ingestAnnualImports({ reporterCode, cmdCode, periods: [period] }, async (query) => {
    const response = await fetchComtradeFinal(query, async () => {
      const { data, error } = await db.rpc("reserve_comtrade_attempt");
      if (error || data !== true) throw new ComtradeRequestError("Comtrade attempt budget or pacing limit reached");
    });
    const { data, error } = await db.rpc("reserve_comtrade_rows", { requested: response.data.length });
    if (error || data !== true) throw new ComtradeRequestError("Comtrade row or database size limit reached");
    return response;
  });
  console.log(JSON.stringify(result));
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  console.error(
    message.startsWith("Usage:") || message === "Configure a registered COMTRADE_API_KEY"
      ? message
      : "Ingestion failed. Check operator configuration and the ingestion run log.",
  );
  process.exitCode = 1;
});
