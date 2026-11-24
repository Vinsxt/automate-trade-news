import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatNumber, RankingShell, SnapshotDate } from "@/components/ranking-shell";
import { TradeDashboard } from "@/components/trade-dashboard";
import { selectPilotDashboard } from "@/lib/trade/dashboard";
import { COHORT_PERIODS, MARKETS, PRODUCTS } from "@/lib/trade/cohort";
import { readRankedMarket, readRankedRelease } from "@/lib/trade/ranked-reader";

type Props = PageProps<"/rankings/[hs6]/[reporter]">;

async function Market({ params, searchParams }: Props) {
  const [{ hs6, reporter }, query] = await Promise.all([params, searchParams]);
  const code = Number(reporter);
  if (!Object.hasOwn(PRODUCTS, hs6) || !Object.hasOwn(MARKETS, code) ||
      typeof query.snapshot !== "string" || !/^[a-f0-9]{64}$/.test(query.snapshot)) notFound();
  const snapshotId = query.snapshot;
  const loaded = await Promise.all([readRankedRelease(hs6, snapshotId), readRankedMarket(snapshotId, code)]).catch(() => null);
  if (!loaded) return <p role="alert">The market details could not be loaded. Reload to try again.</p>;
  const [release, payload] = loaded;
  const result = release?.ranking.rankings.find(row => row.reporter === code);
  if (!release || !payload || !result) notFound();

  const parseYear = (value: unknown) => COHORT_PERIODS.find(year => year === value);
  const from = parseYear(query.from);
  const to = parseYear(query.to);
  const invalidRange = Boolean((query.from && !from) || (query.to && !to) || (from && to && from > to));
  const dashboard = selectPilotDashboard(payload, release.publishedAt, invalidRange ? {} : { from, to });
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" });

  return <>
    <header className="space-y-2">
      <Link className="text-sm font-medium text-emerald-900 underline" href={`/rankings?product=${hs6}&snapshot=${snapshotId}`}>Back to this ranking</Link>
      <h1 className="text-3xl font-semibold">{result.marketName} · {release.ranking.productName}</h1>
      <p className="text-sm text-stone-700">Destination-reported imports · HS 2022 · {hs6} · <SnapshotDate publishedAt={release.publishedAt} stale={release.stale} /> · Source: UN Comtrade</p>
    </header>
    <section className="space-y-2 rounded border border-stone-300 bg-white p-5">
      <h2 className="text-xl font-semibold">Ranking evidence · {result.referenceYear - 3}–{result.referenceYear}</h2>
      <p>{result.score === null ? `Unranked · ${result.reason?.replaceAll("_", " ") ?? "unavailable"}` : `${formatNumber.format(result.score)} / 100 · ${result.hasWeightComparison ? "Comparable weight data" : "Limited weight coverage"}`}</p>
      {result.components && <p className="text-sm text-stone-700">
        Market size {currency.format(result.components.marketSize)} · annualized import growth {formatNumber.format(result.components.importGrowth)}% · Indonesia’s share gain {formatNumber.format(result.components.indonesiaShareGain)} pp
      </p>}
      <p className="text-sm text-stone-700">{result.eligibleCount} eligible markets · {result.method} · <Link className="underline" href="/methodology">How the score is calculated</Link></p>
    </section>
    <search>
      <form action={`/rankings/${hs6}/${code}`} method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="snapshot" value={snapshotId} />
        {([{ name: "from", label: "From year", value: from ?? COHORT_PERIODS[0] }, { name: "to", label: "To year", value: to ?? COHORT_PERIODS[3] }] as const).map(field => (
          <label key={field.name} className="text-sm font-medium">{field.label}
            <select name={field.name} defaultValue={field.value} className="mt-1 block min-h-12 rounded border border-stone-500 bg-white px-3">
              {COHORT_PERIODS.map(year => <option key={year}>{year}</option>)}
            </select>
          </label>
        ))}
        <button className="min-h-12 rounded bg-emerald-900 px-4 text-white">Apply years</button>
      </form>
      {invalidRange && <p role="alert">Choose a start year on or before the end year.</p>}
    </search>
    <TradeDashboard dashboard={dashboard} marketName={result.marketName} />
  </>;
}

export default function MarketPage(props: Props) {
  return <RankingShell><Suspense fallback={<p role="status">Loading market evidence…</p>}><Market {...props} /></Suspense></RankingShell>;
}
