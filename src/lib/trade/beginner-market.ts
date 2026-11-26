import type { PublishedPilotDashboard } from "./dashboard";
import type { RankedRelease } from "./ranked-snapshot";
import { MARKETS } from "./cohort";
import { PARTNER_REGIONS } from "../comtrade/partner-regions";

type RankedMarket = RankedRelease["rankings"][number];

const exclusions: Record<NonNullable<RankedMarket["reason"]>, string> = {
  incomparable_observation: "The HS classification or observations are incompatible.",
  duplicate_observation: "Duplicate records prevent comparison.",
  missing_world: "World import totals are incomplete for the ranking period.",
  invalid_world: "World import totals fail the comparison checks.",
  missing_indonesia: "Indonesia’s data is missing for one or both comparison years.",
  invalid_indonesia: "Indonesia’s reported value cannot be compared with the total.",
  insufficient_cohort: "A ranking needs at least two comparable markets.",
};

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const countries = new Intl.DisplayNames("en", { type: "region", fallback: "none" });

export function usd(value: number) {
  if (Math.abs(value) >= 1e9) return `US$${number.format(value / 1e9)} billion`;
  if (Math.abs(value) >= 1e6) return `US$${number.format(value / 1e6)} million`;
  return `US$${number.format(value)}`;
}

export function metric(value: number | null, unit: string, signed = false) {
  return value === null ? "Unavailable" : `${signed && value > 0 ? "+" : ""}${number.format(value)}${unit}`;
}

export function referenceYears(end: number) {
  return Array.from({ length: 4 }, (_, index) => String(end - 3 + index));
}

export function compareMarkets(ranking: RankedRelease, market?: string, compare?: string) {
  const primary = ranking.rankings.find(row => String(row.reporter) === market);
  if (!primary) return [];
  const alternate = ranking.rankings.find(row => row !== primary && String(row.reporter) === compare);
  return alternate ? [primary, alternate] : [primary];
}

export function beginnerMarket(ranking: RankedRelease, row: RankedMarket, detail: PublishedPilotDashboard | undefined) {
  return {
    row,
    name: MARKETS[row.reporter] ?? row.marketName,
    rank: row.score === null ? null : 1 + ranking.rankings.filter(other => other.score !== null && other.score > row.score!).length,
    tied: row.score !== null && ranking.rankings.some(other => other.reporter !== row.reporter && other.score === row.score),
    exclusion: row.reason ? exclusions[row.reason] : null,
    available: Boolean(detail),
    years: referenceYears(ranking.referenceYear).map(period => {
      const annual = detail?.imports.find(item => item.period === period);
      const suppliers = detail?.supplierYears[period] ?? [];
      const indonesia = suppliers.find(supplier => supplier.partnerCode === 360);
      // The public snapshots can omit partner ISO codes. Resolve through the source's code list.
      const named = suppliers.flatMap(supplier => {
        const code = PARTNER_REGIONS[supplier.partnerCode];
        const name = code ? countries.of(code) : undefined;
        return name && supplier.partnerCode !== 360 ? [{
          name, partnerCode: supplier.partnerCode, importValue: supplier.importValue,
          share: supplier.marketSharePct, change: supplier.shareChangePp,
        }] : [];
      });
      return {
        period, importValue: annual?.importValue ?? null, annualChange: annual?.yearOverYearPct ?? null,
        indonesiaShare: indonesia?.marketSharePct ?? null, indonesiaChange: indonesia?.shareChangePp ?? null,
        suppliers: named.slice(0, 3),
        gainingSuppliers: named.filter(supplier => supplier.change !== null && supplier.change > 0)
          .toSorted((a, b) => b.change! - a.change!).slice(0, 3),
      };
    }),
  };
}

export type BeginnerMarket = ReturnType<typeof beginnerMarket>;

export function annualFinding(name: string, year: BeginnerMarket["years"][number]) {
  if (year.importValue === null) return `Import value for ${name} is unavailable in ${year.period}.`;
  const amount = usd(year.importValue);
  if (year.annualChange === null) return `${name} reported ${amount} in imports in ${year.period}. Change from ${Number(year.period) - 1} is unavailable.`;
  const comparison = year.annualChange === 0 ? "held steady" :
    `${year.annualChange > 0 ? "rose" : "fell"} ${metric(Math.abs(year.annualChange), "%")}`;
  return `In ${year.period}, ${name}’s import value ${comparison} from ${Number(year.period) - 1} to ${amount}.`;
}
