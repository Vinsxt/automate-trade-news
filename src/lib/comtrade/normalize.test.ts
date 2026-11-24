import assert from "node:assert/strict";
import test from "node:test";

import { buildObservationKey, normalizeComtradeResponse, normalizePilotResponse } from "./normalize";

const record = {
  typeCode: "C",
  freqCode: "A",
  refPeriodId: 20250101,
  refYear: 2025,
  period: "2025",
  reporterCode: 699,
  reporterISO: null,
  reporterDesc: null,
  flowCode: "M",
  flowDesc: null,
  partnerCode: 842,
  partnerISO: null,
  partnerDesc: null,
  partner2Code: 0,
  partner2ISO: null,
  partner2Desc: null,
  classificationCode: "H6",
  classificationSearchCode: "HS",
  isOriginalClassification: true,
  cmdCode: "854142",
  cmdDesc: null,
  customsCode: "C00",
  mosCode: "0",
  motCode: 0,
  qtyUnitCode: 5,
  qtyUnitAbbr: null,
  qty: 152951,
  isQtyEstimated: false,
  altQtyUnitCode: 5,
  altQtyUnitAbbr: null,
  altQty: 152951,
  isAltQtyEstimated: false,
  netWgt: null,
  isNetWgtEstimated: false,
  grossWgt: 0,
  isGrossWgtEstimated: false,
  cifvalue: 193697.555,
  fobvalue: null,
  primaryValue: 193697.555,
  legacyEstimationFlag: 0,
  isReported: false,
  isAggregate: true,
};

test("normalizes a Comtrade record without turning missing values into zero", () => {
  const [observation] = normalizeComtradeResponse({ count: 1, data: [record] });

  assert.equal(observation.primaryValue, 193697.555);
  assert.equal(observation.netWeight, null);
  assert.equal(observation.isReported, false);
  assert.equal(observation.partnerCode, 842);
  assert.equal(observation.productCode, "854142");
});

test("observation keys distinguish source dimensions", () => {
  const first = normalizeComtradeResponse({ count: 1, data: [record] })[0];
  const second = normalizeComtradeResponse({
    count: 1,
    data: [{ ...record, partnerCode: 156 }],
  })[0];

  assert.notEqual(buildObservationKey(record), buildObservationKey({ ...record, partnerCode: 156 }));
  assert.notEqual(first.observationKey, second.observationKey);
});

test("rejects an import batch that mixes HS editions or periods", () => {
  assert.equal(normalizePilotResponse({ count: 1, data: [record] }, "2025").length, 1);
  assert.throws(() => normalizePilotResponse({
    count: 2,
    data: [record, { ...record, classificationCode: "H5" }],
  }, "2025"), /outside the pilot query/);
  assert.throws(() => normalizePilotResponse({ count: 1, data: [record] }, "2024"), /outside the pilot query/);
});
