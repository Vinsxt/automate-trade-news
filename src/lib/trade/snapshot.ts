import { createHash } from "node:crypto";

import { calculateTradeSummary, MOVEMENT_THRESHOLDS, type TradeObservationRow } from "../analytics/trade";
import { PILOT_QUERY } from "./pilot";

export interface PilotSnapshotObservation extends Required<TradeObservationRow> {
  observation_key: string;
  ingestion_run_id: string;
  retrieved_at: string;
}

export function buildPilotSnapshot(rows: PilotSnapshotObservation[]) {
  if (!rows.length) throw new Error("No pilot observations to snapshot");

  const observations = rows.toSorted((a, b) =>
    a.period.localeCompare(b.period) || a.partner_code - b.partner_code
  ).map((row, index, ordered) => {
    const previous = ordered[index - 1];
    if (previous?.period === row.period && previous.partner_code === row.partner_code) {
      throw new Error("Duplicate partner in pilot observation period");
    }

    return {
      observation_key: row.observation_key,
      ingestion_run_id: row.ingestion_run_id,
      retrieved_at: row.retrieved_at,
      period: row.period,
      partner_code: row.partner_code,
      partner_iso: row.partner_iso,
      primary_value: row.primary_value,
      net_weight: row.net_weight,
      is_net_wgt_estimated: row.is_net_wgt_estimated,
      is_reported: row.is_reported,
      is_aggregate: row.is_aggregate,
    };
  });

  const { imports, supplierYears, movements } = calculateTradeSummary(observations);
  const payload = {
    schemaVersion: 1,
    calculationVersion: "pilot-v2",
    query: PILOT_QUERY,
    movementThresholds: MOVEMENT_THRESHOLDS,
    input: {
      ingestionRunIds: [...new Set(observations.map((row) => row.ingestion_run_id))].sort(),
      observations,
    },
    metrics: {
      imports,
      supplierYears: Object.fromEntries(supplierYears),
      movements: Object.fromEntries(movements),
    },
  };

  return {
    id: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    ...payload,
  };
}
