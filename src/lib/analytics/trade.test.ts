import assert from "node:assert/strict";
import test from "node:test";

import { calculateTradeSummary, type TradeObservationRow } from "./trade";

const rows: TradeObservationRow[] = [
  { period: "2023", partner_code: 0, partner_iso: null, primary_value: 100 },
  { period: "2023", partner_code: 156, partner_iso: "CHN", primary_value: 60 },
  { period: "2023", partner_code: 842, partner_iso: "USA", primary_value: 20 },
  { period: "2024", partner_code: 0, partner_iso: null, primary_value: 125 },
  { period: "2024", partner_code: 156, partner_iso: "CHN", primary_value: 75 },
  { period: "2024", partner_code: 842, partner_iso: "USA", primary_value: 25 },
];

test("calculates import growth, supplier ranking, shares, and percentage-point change", () => {
  const result = calculateTradeSummary(rows);

  assert.equal(result.imports[1].yearOverYearPct, 25);
  assert.deepEqual(
    result.supplierYears.get("2024")?.map(({ partnerCode, marketSharePct, shareChangePp }) => ({
      partnerCode,
      marketSharePct,
      shareChangePp,
    })),
    [
      { partnerCode: 156, marketSharePct: 60, shareChangePp: 0 },
      { partnerCode: 842, marketSharePct: 20, shareChangePp: 0 },
    ],
  );
});

test("keeps missing totals and zero denominators unavailable", () => {
  const result = calculateTradeSummary([
    { period: "2024", partner_code: 0, partner_iso: null, primary_value: 0 },
    { period: "2024", partner_code: 156, partner_iso: null, primary_value: 5 },
    { period: "2025", partner_code: 0, partner_iso: null, primary_value: null },
    { period: "2025", partner_code: 156, partner_iso: null, primary_value: null },
  ]);

  assert.equal(result.imports[1].importValue, null);
  assert.equal(result.imports[1].yearOverYearPct, null);
  assert.equal(result.supplierYears.get("2024")?.[0].marketSharePct, null);
  assert.equal(result.supplierYears.get("2025")?.length, 0);
});

test("does not call a non-consecutive period a year-over-year comparison", () => {
  const result = calculateTradeSummary([
    { period: "2022", partner_code: 0, partner_iso: null, primary_value: 100 },
    { period: "2022", partner_code: 156, partner_iso: null, primary_value: 50 },
    { period: "2024", partner_code: 0, partner_iso: null, primary_value: 125 },
    { period: "2024", partner_code: 156, partner_iso: null, primary_value: 75 },
  ]);

  assert.equal(result.imports[1].yearOverYearPct, null);
  assert.equal(result.supplierYears.get("2024")?.[0].shareChangePp, null);
});
