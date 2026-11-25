import { ComtradeRequestError, fetchComtradePreview } from "./client";
import { normalizeAnnualImports } from "./normalize";
import { PILOT_QUERY } from "../trade/pilot";
import type { TradeObservation } from "./types";
import { createSupabaseAdminClient } from "../supabase/admin";

export interface IngestionResult {
  ingestionRunId: string;
  periods: string[];
  recordsReceived: number;
  recordsWritten: number;
}

function toDatabaseRow(observation: TradeObservation, ingestionRunId: string, retrievedAt: string) {
  return {
    observation_key: observation.observationKey,
    ingestion_run_id: ingestionRunId,
    source: observation.source,
    type_code: observation.typeCode,
    frequency_code: observation.frequencyCode,
    ref_period_id: observation.refPeriodId,
    period: observation.period,
    reporter_code: observation.reporterCode,
    reporter_iso: observation.reporterIso,
    partner_code: observation.partnerCode,
    partner_iso: observation.partnerIso,
    partner2_code: observation.partner2Code,
    flow_code: observation.flowCode,
    classification_code: observation.classificationCode,
    classification_search_code: observation.classificationSearchCode,
    is_original_classification: observation.isOriginalClassification,
    product_code: observation.productCode,
    customs_code: observation.customsCode,
    mode_of_transport_code: observation.modeOfTransportCode,
    mode_of_transport: observation.modeOfTransport,
    quantity_unit_code: observation.quantityUnitCode,
    quantity: observation.quantity,
    alt_quantity_unit_code: observation.altQuantityUnitCode,
    alt_quantity: observation.altQuantity,
    net_weight: observation.netWeight,
    gross_weight: observation.grossWeight,
    cif_value: observation.cifValue,
    fob_value: observation.fobValue,
    primary_value: observation.primaryValue,
    legacy_estimation_flag: observation.legacyEstimationFlag,
    is_qty_estimated: observation.isQtyEstimated,
    is_alt_qty_estimated: observation.isAltQtyEstimated,
    is_net_wgt_estimated: observation.isNetWgtEstimated,
    is_gross_wgt_estimated: observation.isGrossWgtEstimated,
    is_reported: observation.isReported,
    is_aggregate: observation.isAggregate,
    retrieved_at: retrievedAt,
    source_payload: observation.rawRecord,
  };
}

export async function ingestPilotData(
  periods: string[] = [...PILOT_QUERY.periods],
): Promise<IngestionResult> {
  return ingestAnnualImports({ ...PILOT_QUERY, periods }, fetchComtradePreview);
}

export async function ingestAnnualImports(
  query: { reporterCode: number; cmdCode: string; periods: string[]; acceptOtherEditions?: boolean },
  fetchSlice: typeof fetchComtradePreview,
): Promise<IngestionResult> {
  const { periods } = query;
  const supabase = createSupabaseAdminClient();
  const retrievedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("ingestion_runs")
    .insert({
      source: "UN_COMTRADE",
      status: "RUNNING",
      query: { ...query, flowCode: "M", classificationCode: query.acceptOtherEditions ? "HS" : "H6" },
      started_at: retrievedAt,
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error("Could not create the ingestion run");
  }

  let recordsReceived = 0;
  let recordsWritten = 0;

  try {
    for (const period of periods) {
      const slice = { reporterCode: query.reporterCode, cmdCode: query.cmdCode, period };
      const response = await fetchSlice({ ...slice, flowCode: "M" });
      recordsReceived += response.data.length;
      const observations = normalizeAnnualImports(response, { ...slice, acceptOtherEditions: query.acceptOtherEditions });

      if (observations.length === 0) {
        continue;
      }

      const { data, error } = await supabase
        .from("trade_observations")
        .upsert(
          observations.map((observation) => toDatabaseRow(observation, run.id, retrievedAt)),
          { onConflict: "observation_key" },
        )
        .select("id");

      if (error) {
        throw new Error("Could not persist trade observations");
      }
      recordsWritten += data?.length ?? 0;
    }

    const { error: completeError } = await supabase
      .from("ingestion_runs")
      .update({
        status: "SUCCEEDED",
        completed_at: new Date().toISOString(),
        records_received: recordsReceived,
        records_written: recordsWritten,
      })
      .eq("id", run.id);

    if (completeError) {
      throw new Error("Could not complete the ingestion run");
    }

    return { ingestionRunId: run.id, periods, recordsReceived, recordsWritten };
  } catch (error) {
    await supabase
      .from("ingestion_runs")
      .update({
        status: "FAILED",
        completed_at: new Date().toISOString(),
        records_received: recordsReceived,
        records_written: recordsWritten,
        error_message: error instanceof ComtradeRequestError
          ? error.message
          : "Could not validate or persist trade observations",
      })
      .eq("id", run.id);
    throw error;
  }
}
