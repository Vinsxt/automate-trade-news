import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PILOT_QUERY } from "@/lib/trade/pilot";
import type { PilotSnapshotObservation } from "@/lib/trade/snapshot";

export async function readPilotObservations(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, count, error } = await supabase
    .from("trade_observations")
    .select("observation_key,ingestion_run_id,retrieved_at,period,partner_code,partner_iso,primary_value,net_weight,is_reported,is_aggregate", { count: "exact" })
    .eq("reporter_code", PILOT_QUERY.reporterCode)
    .eq("type_code", "C")
    .eq("frequency_code", "A")
    .eq("flow_code", PILOT_QUERY.flowCode)
    .eq("product_code", PILOT_QUERY.cmdCode)
    .eq("classification_code", PILOT_QUERY.classificationCode)
    .eq("classification_search_code", PILOT_QUERY.classificationSearchCode)
    .eq("partner2_code", 0)
    .eq("customs_code", "C00")
    .eq("mode_of_transport_code", "0")
    .eq("mode_of_transport", 0)
    .in("period", [...PILOT_QUERY.periods])
    .order("period")
    .order("partner_code");

  if (error) throw new Error("Could not load pilot observations");
  const observations = data ?? [];
  if (count !== observations.length) {
    throw new Error("Pilot observations exceeded the query limit");
  }
  return observations satisfies PilotSnapshotObservation[];
}
