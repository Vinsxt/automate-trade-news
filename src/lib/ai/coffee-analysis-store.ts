import { z } from "zod";
import { createSupabaseAdminClient } from "../supabase/admin";
import type { CoffeeAnalysisStore } from "./coffee-analysis";

const responseSchema = z.object({
  ids: z.array(z.string().min(1)).length(3),
  sections: z.array(z.string().min(1)).length(3),
});
const rowSchema = z.object({ response: responseSchema, generated_at: z.iso.datetime({ offset: true }), period_start: z.number(), period_end: z.number() });
const selection = "response,generated_at,period_start,period_end";

function readRow(data: unknown) {
  const row = rowSchema.parse(data);
  return { response: row.response, generatedAt: row.generated_at, coverage: `${row.period_start}–${row.period_end}` };
}

export function coffeeAnalysisStore(dailyCap: number): CoffeeAnalysisStore {
  const db = createSupabaseAdminClient();
  return {
    async find(key) {
      const { data, error } = await db.from("ai_analyses").select(selection).eq("cache_key", key).maybeSingle();
      if (error) throw new Error("Analysis cache read failed");
      return data ? readRow(data) : null;
    },
    async previous(end, key) {
      const { data, error } = await db.from("ai_analyses").select(selection)
        .eq("hs_code", "090111").eq("analysis_type", "coffee_outlook")
        .lte("period_end", end).neq("cache_key", key).order("period_end", { ascending: false })
        .order("generated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error("Previous analysis read failed");
      return data ? readRow(data) : null;
    },
    async reserve({ snapshot, evidence, allowGenerate }) {
      const { data, error } = await db.rpc("reserve_coffee_analysis", {
        release_id: snapshot, provider_model: evidence.model, generation: evidence.promptVersion,
        analysis_key: evidence.key, daily_cap: dailyCap, allow_generate: allowGenerate,
      });
      if (error) throw new Error("Analysis reservation failed");
      return z.union([
        z.object({ state: z.literal("reserved"), attemptId: z.uuid() }),
        z.object({ state: z.enum(["ready", "running", "unavailable"]) }),
      ]).parse(data);
    },
    async save(key, { snapshot, evidence }, response) {
      const { error } = await db.from("ai_analyses").upsert({
        cache_key: key, hs_code: "090111", analysis_type: "coffee_outlook",
        data_hash: evidence.dataHash, prompt_version: evidence.promptVersion, model: evidence.model,
        source_snapshot: snapshot, period_start: evidence.end - 3, period_end: evidence.end, response,
      }, { onConflict: "cache_key", ignoreDuplicates: true });
      if (error) throw new Error("Analysis cache write failed");
      const saved = await this.find(key);
      if (!saved) throw new Error("Analysis cache write was not visible");
      return saved;
    },
    async finish(attemptId, status) {
      const { error } = await db.from("trade_explanation_attempts").update({ status }).eq("id", attemptId);
      if (error) throw new Error("Analysis attempt update failed");
    },
  };
}
