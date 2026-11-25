import { createSupabaseReader } from "@/lib/supabase/reader";
import type { RankedRelease } from "./ranked-snapshot";
import type { PublishedPilotDashboard } from "./dashboard";

export async function readRankedRelease(hs6: string, snapshotId?: string) {
  let query = createSupabaseReader().from("trade_snapshots")
    .select("id,published_at,ranked_summary")
    .eq("ranked_summary->>hs6", hs6)
    .not("published_at", "is", null);
  if (snapshotId) query = query.eq("id", snapshotId);

  const { data, error } = await query.order("published_at", { ascending: false }).order("id").limit(1).maybeSingle();
  if (error) throw new Error("Could not load the published ranking");
  if (!data) return null;
  const publishedAt = data.published_at as string;
  return {
    id: data.id as string,
    publishedAt,
    stale: Date.now() - Date.parse(publishedAt) > 365 * 86400000,
    ranking: data.ranked_summary as RankedRelease,
  };
}

export async function readRankedMarket(snapshotId: string, reporter: number) {
  const { data, error } = await createSupabaseReader().from("trade_ranked_details")
    .select("dashboard").eq("snapshot_id", snapshotId).eq("reporter_code", reporter).maybeSingle();
  if (error) throw new Error("Could not load published market details");
  return data?.dashboard as PublishedPilotDashboard | undefined;
}

export async function readRankedExplanation(snapshotId: string, reporter: number, hash: string) {
  const { data, error } = await createSupabaseReader().from("trade_ranked_explanations")
    .select("findings").eq("snapshot_id", snapshotId).eq("reporter_code", reporter)
    .eq("evidence_hash", hash).maybeSingle();
  if (error) throw new Error("Could not load the cached market explanation");
  return data?.findings;
}
