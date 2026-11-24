import Link from "next/link";
import { Suspense } from "react";
import { formatNumber, RankingShell, SnapshotDate } from "@/components/ranking-shell";
import { PRODUCTS } from "@/lib/trade/cohort";
import { readRankedRelease } from "@/lib/trade/ranked-reader";

type Query = Promise<{ product?: string | string[]; snapshot?: string | string[] }>;

async function Ranking({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const hs6 = query.product ?? "090111";
  if (typeof hs6 !== "string" || !Object.hasOwn(PRODUCTS, hs6) ||
      (query.snapshot !== undefined && (typeof query.snapshot !== "string" || !/^[a-f0-9]{64}$/.test(query.snapshot)))) {
    return <p role="alert">Choose a supported product from the <Link href="/rankings">ranking page</Link>.</p>;
  }

  const release = await readRankedRelease(hs6, query.snapshot).catch(() => undefined);
  const shortlist = release?.ranking.rankings.filter(row => row.shortlisted) ?? [];
  return (
    <>
      <search>
        <form action="/rankings" method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">HS 2022 product
            <select name="product" defaultValue={hs6} className="mt-1 block min-h-12 max-w-[85vw] rounded border border-stone-500 bg-white px-3">
              {Object.entries(PRODUCTS).map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
            </select>
          </label>
          <button className="min-h-12 rounded bg-emerald-900 px-4 text-white">Compare markets</button>
        </form>
      </search>
      {release === undefined ? <p role="alert">The ranking could not be loaded. Reload to try again.</p> : release === null ? (
        <section className="rounded border border-stone-300 bg-white p-5">
          <h2 className="font-semibold">No ranking published for {PRODUCTS[hs6]}</h2>
          <p className="mt-2 text-sm">A ranking appears after all ten markets have been checked for the four reference years.</p>
        </section>
      ) : (
        <section className="space-y-3" aria-labelledby="ranked-product">
          <h2 id="ranked-product" className="text-xl font-semibold">{release.ranking.productName} · {hs6}</h2>
          <p className="text-sm text-stone-700">HS 2022 · {release.ranking.referenceYear - 3}–{release.ranking.referenceYear} · <SnapshotDate publishedAt={release.publishedAt} stale={release.stale} /> · Source: UN Comtrade</p>
          <p className="text-sm text-stone-700">{release.ranking.rankings.length} screened · {release.ranking.rankings[0]?.eligibleCount ?? 0} eligible</p>
          {!shortlist.length && <p>No shortlist is available. A ranking requires at least two comparable destinations.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shortlist.map(row => (
              <article key={row.reporter} className="space-y-3 rounded border border-stone-300 bg-white p-5">
                <h3 className="text-lg font-semibold"><Link className="underline" href={`/rankings/${hs6}/${row.reporter}?snapshot=${release.id}`}>{row.marketName}</Link></h3>
                <p className="text-2xl font-semibold tabular-nums">{formatNumber.format(row.score!)} / 100</p>
                <dl className="space-y-1 text-sm">
                  <div> <dt className="inline">Market size</dt><dd className="float-right">{formatNumber.format(row.points!.marketSize)} points</dd></div>
                  <div> <dt className="inline">Import growth</dt><dd className="float-right">{formatNumber.format(row.points!.importGrowth)} points</dd></div>
                  <div> <dt className="inline">Indonesia’s share gain</dt><dd className="float-right">{formatNumber.format(row.points!.indonesiaShareGain)} points</dd></div>
                </dl>
                <p className="text-sm font-medium">{row.hasWeightComparison ? "Comparable weight data" : "Limited weight coverage"}</p>
              </article>
            ))}
          </div>
          <details className="rounded border border-stone-300 bg-white p-4">
            <summary className="cursor-pointer font-medium">All screened markets</summary>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {release.ranking.rankings.map(row => <li key={row.reporter}>
                <Link className="underline" href={`/rankings/${hs6}/${row.reporter}?snapshot=${release.id}`}>{row.marketName}</Link>
                {" · "}{row.score === null ? `Unranked (${row.reason?.replaceAll("_", " ") ?? "unavailable"})` : formatNumber.format(row.score)}
              </li>)}
            </ul>
          </details>
        </section>
      )}
    </>
  );
}

export default function RankingPage({ searchParams }: { searchParams: Query }) {
  return <RankingShell>
    <header className="space-y-2"><h1 className="text-3xl font-semibold">Which markets are worth a closer look?</h1><p>Compare destination markets for an Indonesian export product, then inspect the evidence behind each result.</p></header>
    <Suspense fallback={<p role="status">Loading the opportunity ranking…</p>}><Ranking searchParams={searchParams} /></Suspense>
  </RankingShell>;
}
