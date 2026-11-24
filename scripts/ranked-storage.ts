import type { createSupabaseAdminClient } from "../src/lib/supabase/admin";

export async function assertRankedStorageHeadroom(db: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await db.rpc("read_trade_database_bytes");
  const bytes = Number(data);
  if (error || !Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new Error("Could not verify database size");
  }
  if (bytes >= 145_000_000) throw new Error("Reached the 145 MB backfill storage stop");
  return bytes;
}
