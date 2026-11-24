import { writeFile } from "node:fs/promises";

import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import { readPilotObservations } from "../src/lib/trade/observations";
import { buildPilotSnapshot } from "../src/lib/trade/snapshot";

async function main() {
  const [outputPath, ...rest] = process.argv.slice(2);
  if (!outputPath || rest.length) {
    console.error("Usage: npm run snapshot:pilot -- <output.json>");
    process.exitCode = 1;
    return;
  }

  try {
    const observations = await readPilotObservations(createSupabaseAdminClient());
    const snapshot = buildPilotSnapshot(observations);
    await writeFile(outputPath, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(`Built snapshot ${snapshot.id} from ${observations.length} observations.`);
  } catch (error) {
    console.error(error instanceof Error && "code" in error && error.code === "EEXIST"
      ? "Snapshot output already exists. Choose a new file."
      : "Could not build the pilot snapshot. Check Supabase access, source coverage, and the output path.");
    process.exitCode = 1;
  }
}

void main();
