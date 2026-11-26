import Link from "next/link";
import { Suspense } from "react";
import { ResearchSkeleton } from "@/components/research-skeleton";
import { formatNumber, RankingShell, SnapshotDate } from "@/components/ranking-shell";
import { PRODUCTS } from "@/lib/trade/cohort";
import { readRankedRelease } from "@/lib/trade/ranked-reader";

type Query = Promise<{ product?: string | string[]; snapshot?: string | string[] }>;

async function Ranking({ searchParams }: { searchParams: Query }) {
  const query = await searchParams;
  const hs6 = query.product;
  if (hs6 === undefined) return <p><Link className="underline" href="/#products">Choose a product from the catalog</Link> to view its market scores.</p>;
  if (typeof hs6 !== "string" || !Object.hasOwn(PRODUCTS, hs6) ||
      (query.snapshot !== undefined && (typeof query.snapshot !== "string" || !/^[a-f0-9]{64}$/.test(query.snapshot)))) {
    return <p role="alert">Choose a supported product from the <Link href="/rankings">ranking page</Link>.</p>;
  }

  const release = await readRankedRelease(hs6, query.snapshot).catch(() => undefined);
  return (
    <>
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong underline" href="/#products">Choose another product</Link>
      {release === undefined ? <p role="alert">The ranking could not be loaded. Reload to try again.</p> : release === null ? (
        <section className="surface p-5">
          <h2 className="font-semibold">No ranking published for {PRODUCTS[hs6]}</h2>
          <p className="mt-2 text-sm">A ranking appears after all ten markets have been checked for the four reference years.</p>
        </section>
      ) : (
        <section className="space-y-3" aria-labelledby="ranked-product">
          <h2 id="ranked-product" className="section-title">{release.ranking.productName} · {hs6}</h2>
          <p className="text-sm text-secondary">HS 2022 · {release.ranking.referenceYear - 3}–{release.ranking.referenceYear} · <SnapshotDate publishedAt={release.publishedAt} stale={release.stale} /> · Source: UN Comtrade</p>
          <p className="text-sm text-secondary">{release.ranking.rankings.length} screened · {release.ranking.rankings[0]?.eligibleCount ?? 0} eligible</p>
          <ul className="surface divide-y divide-line">
            {release.ranking.rankings.map(row => <li key={row.reporter}>
              <Link href={`/rankings/${hs6}/${row.reporter}?snapshot=${release.id}`}
                className="interactive-row flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                <span className="font-semibold text-brand-strong">{row.marketName}</span>
                <span className="text-sm text-secondary">{row.score === null
                  ? `Unranked${row.reason ? ` · ${row.reason.replaceAll("_", " ")}` : ""}`
                  : `${formatNumber.format(row.score)} / 100`}</span>
              </Link>
            </li>)}
          </ul>
        </section>
      )}
    </>
  );
}

export default function RankingPage({ searchParams }: { searchParams: Query }) {
  return <RankingShell>
    <header className="space-y-2"><h1 className="page-title">Market rankings</h1><p>See scores and data coverage for all screened destinations.</p></header>
    <Suspense fallback={<ResearchSkeleton label="Loading the opportunity ranking" />}><Ranking searchParams={searchParams} /></Suspense>
  </RankingShell>;
}
