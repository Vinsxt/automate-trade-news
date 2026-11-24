import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import type { PublishedPilotDashboard } from "../src/lib/trade/dashboard";
import { readPilotObservations } from "../src/lib/trade/observations";
import { buildPilotSnapshot } from "../src/lib/trade/snapshot";

async function main() {
  const db = createSupabaseAdminClient();
  const snapshot = buildPilotSnapshot(await readPilotObservations(db));
  const coverage: PublishedPilotDashboard["coverage"] = {};
  for (const row of snapshot.input.observations) {
    const period = coverage[row.period] ??= { observationCount: 0, notReported: 0, aggregate: 0 };
    period.observationCount++;
    if (!row.is_reported) period.notReported++;
    if (row.is_aggregate) period.aggregate++;
  }

  const dashboard: PublishedPilotDashboard = { ...snapshot.metrics, coverage };
  const { error } = await db.rpc("publish_pilot_snapshot", {
    snapshot_id: snapshot.id,
    version: snapshot.calculationVersion,
    dashboard,
    inputs: snapshot.input,
  });
  if (error) throw new Error("Could not publish pilot snapshot");
  console.log(`Published pilot snapshot ${snapshot.id}.`);
}

void main().catch(() => {
  console.error("Pilot publication failed. Check the migration, operator configuration and source coverage.");
  process.exitCode = 1;
});
