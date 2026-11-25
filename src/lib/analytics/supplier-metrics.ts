interface WeightObservation {
  value: number | null;
  weight: number | null;
  currency: string;
  weightUnit: string;
  estimated: boolean | null;
}

function nonnegative(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

/** Rows must describe the same comparable slice and must not overlap. */
export function calculateUnitValue(rows: WeightObservation[]) {
  let totalValue = 0;
  let weightedValue = 0;
  let usableWeight = 0;
  for (const row of rows) {
    if (row.currency !== "USD" || !nonnegative(row.value)) {
      return { usdPerKg: null, valueCoveragePct: null };
    }
    totalValue += row.value;
    if (row.weightUnit !== "kg" || row.estimated !== false || !nonnegative(row.weight) || row.weight === 0) continue;
    weightedValue += row.value;
    usableWeight += row.weight;
  }

  const valueCoveragePct = totalValue > 0 && Number.isFinite(totalValue) ? 100 * (weightedValue / totalValue) : null;
  const ratio = weightedValue / usableWeight;
  return {
    usdPerKg: valueCoveragePct !== null && valueCoveragePct >= 80 &&
      Number.isFinite(usableWeight) && Number.isFinite(ratio) ? ratio : null,
    valueCoveragePct,
  };
}

export function unitValueGapPct(indonesia: number | null, comparator: number | null) {
  if (!nonnegative(indonesia) || !nonnegative(comparator) || comparator === 0) return null;
  const gap = 100 * (indonesia / comparator - 1);
  return Number.isFinite(gap) ? gap : null;
}

/** Pass the non-overlapping individual-country breakdown, excluding World and groups. */
export function supplierConcentration(world: number | null, countryValues: (number | null)[]) {
  if (!nonnegative(world) || world === 0) return { hhi: null, coveragePct: null };
  const valid = countryValues.filter(nonnegative);
  const sum = valid.reduce((total, value) => total + value, 0);
  const coveragePct = 100 * (sum / world);
  if (!Number.isFinite(coveragePct)) return { hhi: null, coveragePct: null };
  const hhi = coveragePct >= 95 && coveragePct <= 105
    ? 10000 * valid.reduce((total, value) => total + (value / sum) ** 2, 0)
    : null;
  return { hhi, coveragePct };
}
