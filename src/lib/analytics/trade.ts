export interface TradeObservationRow {
  period: string;
  partner_code: number;
  partner_iso: string | null;
  primary_value: number | string | null;
  net_weight?: number | string | null;
  is_reported?: boolean;
  is_aggregate?: boolean;
}

export interface ImportYear {
  period: string;
  importValue: number | null;
  yearOverYearPct: number | null;
  netWeightKg: number | null;
}

export interface SupplierYear {
  partnerCode: number;
  partnerIso: string | null;
  importValue: number;
  marketSharePct: number | null;
  shareChangePp: number | null;
  rank: number;
  rankChange: number | null;
  importValueChange: number | null;
}

export const MOVEMENT_THRESHOLDS = { importValuePct: 20, supplierSharePp: 5 } as const;

export type Movement =
  | { kind: "import_value"; change: number }
  | { kind: "supplier_share"; change: number; partnerCode: number; partnerIso: string | null };

function valueOf(value: TradeObservationRow["primary_value"]): number | null {
  if (value === null || (typeof value === "string" && !value.trim())) return null;
  const valueNumber = typeof value === "number" ? value : Number(value);
  return Number.isFinite(valueNumber) && valueNumber >= 0 ? valueNumber : null;
}

export function calculateTradeSummary(rows: TradeObservationRow[]) {
  const periods = [...new Set(rows.map((row) => row.period))].sort();
  const totals = new Map<string, number>();
  const weights = new Map<string, number | null>();

  for (const row of rows) {
    if (row.partner_code !== 0) continue;
    const value = valueOf(row.primary_value);
    if (value !== null) totals.set(row.period, value);
    weights.set(row.period, valueOf(row.net_weight ?? null));
  }

  const imports: ImportYear[] = periods.map((period, index) => {
    const importValue = totals.get(period) ?? null;
    const priorValue = index > 0 ? totals.get(periods[index - 1]) : undefined;
    return {
      period,
      importValue,
      netWeightKg: weights.get(period) ?? null,
      yearOverYearPct:
        importValue !== null &&
        priorValue !== undefined &&
        priorValue > 0 &&
        Number(period) - Number(periods[index - 1]) === 1
          ? ((importValue - priorValue) / priorValue) * 100
          : null,
    };
  });

  const suppliersByPeriod = new Map<string, Map<number, { iso: string | null; value: number }>>();
  for (const row of rows) {
    if (row.partner_code === 0) continue;
    const value = valueOf(row.primary_value);
    if (value === null) continue;
    const suppliers = suppliersByPeriod.get(row.period) ?? new Map();
    const current = suppliers.get(row.partner_code);
    suppliers.set(row.partner_code, {
      iso: row.partner_iso ?? current?.iso ?? null,
      value: (current?.value ?? 0) + value,
    });
    suppliersByPeriod.set(row.period, suppliers);
  }

  const supplierYears = new Map<string, SupplierYear[]>();
  const movements = new Map<string, Movement[]>();
  for (let index = 0; index < periods.length; index += 1) {
    const period = periods[index];
    const priorPeriod = periods[index - 1];
    const total = totals.get(period);
    const consecutivePrior = priorPeriod && Number(period) - Number(priorPeriod) === 1;
    const priorTotal = consecutivePrior ? totals.get(priorPeriod) : undefined;
    const currentSuppliers = suppliersByPeriod.get(period) ?? new Map();
    const priorSuppliers = consecutivePrior ? suppliersByPeriod.get(priorPeriod) : undefined;
    const priorRanks = new Map(supplierYears.get(priorPeriod)?.map(({ partnerCode, rank }) => [partnerCode, rank]));
    const suppliers = [...currentSuppliers.entries()]
      .sort(([aCode, a], [bCode, b]) => b.value - a.value || aCode - bCode)
      .map(([partnerCode, supplier], index) => {
        const marketSharePct = total && total > 0 ? (supplier.value / total) * 100 : null;
        const priorSupplierValue = priorSuppliers?.get(partnerCode)?.value;
        const priorShare =
          priorTotal !== undefined && priorTotal > 0 && priorSupplierValue !== undefined
            ? (priorSupplierValue / priorTotal) * 100
            : null;
        const rank = index + 1;
        const priorRank = priorRanks.get(partnerCode);
        return {
          partnerCode,
          rank,
          rankChange: consecutivePrior && priorRank !== undefined ? priorRank - rank : null,
          importValueChange: priorSupplierValue === undefined ? null : supplier.value - priorSupplierValue,
          partnerIso: supplier.iso,
          importValue: supplier.value,
          marketSharePct,
          shareChangePp:
            marketSharePct !== null && priorShare !== null ? Number((marketSharePct - priorShare).toFixed(10)) : null,
        };
      });
    supplierYears.set(period, suppliers);

    const flags: Movement[] = [];
    const change = imports[index].yearOverYearPct;
    if (change !== null && Math.abs(change) >= MOVEMENT_THRESHOLDS.importValuePct) {
      flags.push({ kind: "import_value", change });
    }
    for (const { shareChangePp, partnerCode, partnerIso } of suppliers) {
      if (shareChangePp !== null && Math.abs(shareChangePp) >= MOVEMENT_THRESHOLDS.supplierSharePp) {
        flags.push({ kind: "supplier_share", change: shareChangePp, partnerCode, partnerIso });
      }
    }
    movements.set(period, flags);
  }

  return { imports, supplierYears, movements };
}
