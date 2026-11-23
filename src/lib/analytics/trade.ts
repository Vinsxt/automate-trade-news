export interface TradeObservationRow {
  period: string;
  partner_code: number;
  partner_iso: string | null;
  primary_value: number | string | null;
  is_reported?: boolean;
  is_aggregate?: boolean;
}

export interface ImportYear {
  period: string;
  importValue: number | null;
  yearOverYearPct: number | null;
}

export interface SupplierYear {
  partnerCode: number;
  partnerIso: string | null;
  importValue: number;
  marketSharePct: number | null;
  shareChangePp: number | null;
}

function valueOf(value: TradeObservationRow["primary_value"]): number | null {
  if (value === null) return null;
  const valueNumber = typeof value === "number" ? value : Number(value);
  return Number.isFinite(valueNumber) && valueNumber >= 0 ? valueNumber : null;
}

export function calculateTradeSummary(rows: TradeObservationRow[]) {
  const periods = [...new Set(rows.map((row) => row.period))].sort();
  const totals = new Map<string, number>();

  for (const row of rows) {
    if (row.partner_code !== 0) continue;
    const value = valueOf(row.primary_value);
    if (value !== null) totals.set(row.period, value);
  }

  const imports: ImportYear[] = periods.map((period, index) => {
    const importValue = totals.get(period) ?? null;
    const priorValue = index > 0 ? totals.get(periods[index - 1]) : undefined;
    return {
      period,
      importValue,
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
  for (let index = 0; index < periods.length; index += 1) {
    const period = periods[index];
    const priorPeriod = periods[index - 1];
    const total = totals.get(period);
    const consecutivePrior = priorPeriod && Number(period) - Number(priorPeriod) === 1;
    const priorTotal = consecutivePrior ? totals.get(priorPeriod) : undefined;
    const currentSuppliers = suppliersByPeriod.get(period) ?? new Map();
    const priorSuppliers = consecutivePrior ? suppliersByPeriod.get(priorPeriod) : undefined;
    const suppliers = [...currentSuppliers.entries()]
      .map(([partnerCode, supplier]) => {
        const marketSharePct = total && total > 0 ? (supplier.value / total) * 100 : null;
        const priorSupplierValue = priorSuppliers?.get(partnerCode)?.value;
        const priorShare =
          priorTotal !== undefined && priorTotal > 0 && priorSupplierValue !== undefined
            ? (priorSupplierValue / priorTotal) * 100
            : null;
        return {
          partnerCode,
          partnerIso: supplier.iso,
          importValue: supplier.value,
          marketSharePct,
          shareChangePp:
            marketSharePct !== null && priorShare !== null ? marketSharePct - priorShare : null,
        };
      })
      .sort((a, b) => b.importValue - a.importValue);
    supplierYears.set(period, suppliers);
  }

  return { imports, supplierYears };
}
