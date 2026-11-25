import type { ImportYear, Movement, SupplierYear } from "@/lib/analytics/trade";
import { createSupabaseReader } from "@/lib/supabase/reader";
import type { TradeSelection } from "@/lib/validations/trade-selection";


interface PeriodCoverage {
  observationCount: number;
  notReported: number;
  aggregate: number;
}

export interface PublishedPilotDashboard {
  imports: ImportYear[];
  supplierYears: Record<string, SupplierYear[]>;
  movements: Record<string, Movement[]>;
  coverage: Record<string, PeriodCoverage>;
}

export function selectPilotDashboard(
  payload: PublishedPilotDashboard,
  publishedAt: string | null,
  selection: TradeSelection = {},
) {
  const includesPeriod = (period: string) =>
    (!selection.from || period >= selection.from) && (!selection.to || period <= selection.to);

  const imports = payload.imports.filter(({ period }) => includesPeriod(period));
  const latestPeriod = imports.at(-1)?.period ?? null;
  const totals = { observationCount: 0, notReported: 0, aggregate: 0 };
  for (const [period, coverage] of Object.entries(payload.coverage)) {
    if (!includesPeriod(period)) continue;
    totals.observationCount += coverage.observationCount;
    totals.notReported += coverage.notReported;
    totals.aggregate += coverage.aggregate;
  }

  return {
    imports,
    availablePeriods: payload.imports.map(({ period }) => period),
    supplierYears: Object.fromEntries(Object.entries(payload.supplierYears).filter(([period]) => includesPeriod(period))),
    movements: latestPeriod ? payload.movements[latestPeriod] ?? [] : [],
    latestPeriod,
    latestSuppliers: latestPeriod ? payload.supplierYears[latestPeriod] ?? [] : [],
    sourceFlags: { notReported: totals.notReported, aggregate: totals.aggregate },
    publishedAt,
    observationCount: totals.observationCount,
  };
}

export async function getPilotDashboardData(selection: TradeSelection = {}) {
  const { data, error } = await createSupabaseReader()
    .from("trade_snapshots")
    .select("published_at,pilot_dashboard")
    .not("pilot_dashboard", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Could not load the published trade dashboard");
  return selectPilotDashboard(
    data?.pilot_dashboard ?? { imports: [], supplierYears: {}, movements: {}, coverage: {} },
    data?.published_at ?? null,
    selection,
  );
}

export type PilotDashboardData = Awaited<ReturnType<typeof getPilotDashboardData>>;
