import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { BeginnerMarketComparison } from "@/components/beginner-market-comparison";
import { GreenCoffeeOverview } from "@/components/green-coffee-overview";
import { ResearchSkeleton } from "@/components/research-skeleton";
import { RankingShell } from "@/components/ranking-shell";
import { TradeQuestions } from "@/components/trade-questions";
import { beginnerBriefEvidence, traceBeginnerBrief } from "@/lib/trade/beginner-brief";
import { COFFEE_EXAMPLE, TRADE_SOURCES } from "@/lib/trade/beginner-catalog";
import { annualFinding, beginnerMarket, compareMarkets, metric, referenceYears } from "@/lib/trade/beginner-market";
import { MARKETS, PRODUCTS } from "@/lib/trade/cohort";
import { EXPLANATION_MODELS, rankingEvidence, traceFindings } from "@/lib/trade/ranked-explanation";
import { readRankedExplanation, readRankedMarket, readRankedRelease } from "@/lib/trade/ranked-reader";

type Props = PageProps<"/mulai/[hs6]">;
const field = "field-control mt-1 block w-full";

async function MarketResearch({ params, searchParams }: Props) {
  const [{ hs6 }, query] = await Promise.all([params, searchParams]);
  if (!Object.hasOwn(PRODUCTS, hs6)) notFound();
  const { snapshot, market, compare, year } = query;
  const coffee = hs6 === "090111";
  const assistant = query.view === "assistant";
  const currentUrl = `/mulai/${hs6}`;
  const header = (example = false) => <header className="space-y-2">
    {example && <p className="text-sm font-semibold text-brand-strong">Coffee market example</p>}
    <h1 className="page-title">{assistant ? "AI research" : coffee ? "Green coffee" : PRODUCTS[hs6]}</h1>
    <p className="text-sm text-secondary">{(coffee || assistant) && `${PRODUCTS[hs6]} · `}HS {hs6} (HS 2022)</p>
  </header>;
  if ((snapshot !== undefined && (typeof snapshot !== "string" || !/^[a-f0-9]{64}$/.test(snapshot))) ||
      [market, compare, year].some(value => value !== undefined && typeof value !== "string")) {
    return <>{header()}<p role="alert">Choose a valid market, year, and release.</p><Link className="underline" href={currentUrl}>Open latest comparison</Link></>;
  }
  const example = snapshot === COFFEE_EXAMPLE && hs6 === "090111";
  const release = await readRankedRelease(hs6, snapshot).catch(() => undefined);
  if (!release) return <>
    {header(example)}
    {release === undefined ?
      <p role="alert">Could not load the release. Reload to try again.</p> :
      <p>{snapshot ? "This release is unavailable." : "No release has been published for this product."}</p>}
    <Link className="text-brand-strong underline" href={snapshot ? currentUrl : "/#products"}>{snapshot ? "Open latest comparison" : "Choose another product"}</Link>
  </>;

  const { ranking } = release;
  const periods = referenceYears(ranking.referenceYear);
  const validCodes = ranking.rankings.map(row => String(row.reporter));
  if ((typeof market === "string" && !validCodes.includes(market)) || (typeof compare === "string" && compare && !validCodes.includes(compare)) ||
    (typeof year === "string" && !periods.includes(year))) {
    return <>{header(example)}<p role="alert">That market or year is unavailable in this release.</p><Link className="underline" href={`${currentUrl}?snapshot=${release.id}`}>Reset filters</Link></>;
  }
  const sameMarket = typeof market === "string" && market === compare;
  const selected = compareMarkets(ranking, typeof market === "string" ? market : undefined, typeof compare === "string" ? compare : undefined);
  const destinations = (
    <section className="space-y-4" aria-labelledby="destinations">
      <div>
        <h2 id="destinations" className="section-title">Destination markets</h2>
        <p className="mt-1 text-sm text-secondary">Choose a market to see import values and major suppliers.</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ranking.rankings.toSorted((a, b) => a.marketName.localeCompare(b.marketName, "en")).map(row => {
          const active = String(row.reporter) === market;
          const params = new URLSearchParams({ snapshot: release.id, market: String(row.reporter) });
          if (typeof year === "string") params.set("year", year);
          if (assistant) params.set("view", "assistant");
          return <li key={row.reporter}>
            <Link href={`${currentUrl}?${params}`} prefetch={false} aria-current={active ? "page" : undefined}
              className={`interactive-row flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${active ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover" : "border-line bg-surface text-ink"}`}>
              {row.marketName} <ArrowUpRight size={15} className="shrink-0" aria-hidden="true" />
            </Link>
          </li>;
        })}
      </ul>
    </section>
  );
  if (!selected.length) return <>
    {header(example)}
    <p className="text-sm text-secondary">Annual imports · {periods[0]}–{periods.at(-1)} · <a className="underline" href={TRADE_SOURCES.comtrade.href}>UN Comtrade</a></p>
    {coffee && !assistant && <Suspense fallback={<p role="status">Loading leading green coffee markets…</p>}>
      <GreenCoffeeOverview ranking={ranking} snapshot={release.id} />
    </Suspense>}
    {destinations}
  </>;
  const loaded = await Promise.allSettled(selected.map(row => readRankedMarket(release.id, row.reporter)));
  const markets = selected.map((row, index) => beginnerMarket(ranking, row, loaded[index].status === "fulfilled" ? loaded[index].value : undefined));
  const latest = periods.findLast(period => markets.some(item => item.years.some(row => row.period === period && row.importValue !== null)));
  const period = typeof year === "string" ? year : latest ?? periods.at(-1)!;
  const eligible = ranking.rankings[0]?.eligibleCount ?? 0;
  const annual = markets.map(item => item.years.find(row => row.period === period)!);
  const date = release.publishedAt.slice(0, 10);
  const rankedUrl = `/rankings?product=${hs6}&snapshot=${release.id}`;
  const [first, second] = markets;
  const [firstYear, secondYear] = annual;
  const comparable = firstYear?.importValue != null && secondYear?.importValue != null;
  const recentChanges = firstYear?.annualChange != null && secondYear?.annualChange != null;
  const bigger = comparable && firstYear.importValue !== secondYear.importValue ?
    (firstYear.importValue! > secondYear.importValue! ? first : second) : null;
  const higherChange = recentChanges && firstYear.annualChange !== secondYear.annualChange ?
    (firstYear.annualChange! > secondYear.annualChange! ? first : second) : null;
  const higherYear = higherChange === first ? firstYear : secondYear;
  const pinned = new URLSearchParams({ snapshot: release.id, year: period });
  if (first) pinned.set("market", String(first.row.reporter));
  pinned.set("compare", second ? String(second.row.reporter) : "");
  const comparisonUrl = `${currentUrl}?${pinned}`;
  const filters = (
    <form action={currentUrl} method="get" className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
      {assistant && <input type="hidden" name="view" value="assistant" />}
      <input type="hidden" name="snapshot" value={release.id} />
      {(["market", "compare"] as const).map((name, index) => <label key={name} className="min-w-0 text-sm font-medium">
        {name === "market" ? "Primary market" : "Comparison market"}
        <select name={name} defaultValue={markets[index]?.row.reporter ?? ""} className={field}>
          {index === 1 && <option value="">No comparison</option>}
          {ranking.rankings.map(row => <option key={row.reporter} value={row.reporter}>{MARKETS[row.reporter] ?? row.marketName}</option>)}
        </select>
      </label>)}
      <label className="min-w-0 text-sm font-medium">Trade year
        <select name="year" defaultValue={period} className={field}>{periods.map(item => <option key={item}>{item}</option>)}</select>
      </label>
      <button type="submit" className="action-primary">Apply filters</button>
    </form>
  );
  const source = <p className="text-sm text-secondary">Trade year {period} · <a className="underline" href={TRADE_SOURCES.comtrade.href}>UN Comtrade</a> · Published <time dateTime={release.publishedAt}>{date} UTC</time>{latest && latest !== period && ` · Latest available: ${latest}`}</p>;
  const questions = <TradeQuestions key={comparisonUrl} hs6={hs6} snapshot={release.id} markets={markets} period={period} />;
  const loadNotice = <>{sameMarket && <p role="status">Choose two different markets to compare them.</p>}
    {loaded.some(result => result.status === "rejected") && <p role="alert">Some market records could not be loaded. Reload to try again.</p>}</>;

  if (assistant) {
    const approved = (process.env.BEGINNER_GEMINI_APPROVED_CASES ?? "").split(",").map(value => value.trim());
    const findings = await Promise.all(markets.map(async ({ row, ...item }) => {
      if (period !== String(ranking.referenceYear)) return null;
      if (approved.includes(`${hs6}:${row.reporter}`)) {
        const evidence = EXPLANATION_MODELS.map(model => beginnerBriefEvidence({ row, ...item }, model));
        if (evidence[0].findings.length) {
          try {
            const ids = await readRankedExplanation(release.id, row.reporter, evidence.map(record => record.hash));
            return traceBeginnerBrief(evidence[0], ids);
          } catch {
            // Try the validated analyst findings from this release.
          }
        }
      }
      const evidence = EXPLANATION_MODELS.map(model => rankingEvidence(row, model));
      if (!evidence[0].findings.length) return null;
      try {
        const ids = await readRankedExplanation(release.id, row.reporter, evidence.map(record => record.hash));
        return { facts: traceFindings(evidence[0].findings, ids), question: null };
      } catch {
        return null;
      }
    }));
    return <>
      {header(example)}
      {source}
      {destinations}
      <form action="/assistant" method="get" className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 text-sm font-medium">Research product
          <select name="product" defaultValue={hs6} className={field}>
            {Object.entries(PRODUCTS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <button type="submit" className="action-secondary">Open product</button>
      </form>
      {filters}
      {loadNotice}
      <section className="space-y-3 border-y border-line py-4" aria-labelledby="ai-findings">
        <h2 id="ai-findings" className="text-xl font-semibold">Gemini findings</h2>
        <p className="text-sm text-secondary">Gemini selects approved findings in an operator-run batch. The app fills in the figures from this release. Questions below use a separate data lookup.</p>
        {markets.map((item, index) => {
          const finding = findings[index];
          return <article className="space-y-2 border-t border-line pt-3" key={item.row.reporter} data-explainable data-market={item.row.reporter}>
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-sm text-secondary">{finding
              ? `Selected by Gemini · ${periods[0]}–${periods.at(-1)}`
              : period === String(ranking.referenceYear) ? "Gemini findings unavailable for this release. Showing the data summary." : "Gemini findings cover the ranking period. Showing a summary for the selected year."}</p>
            <ul className="list-disc space-y-1 pl-5">{(finding?.facts ?? [annualFinding(item.name, annual[index])]).map(fact => <li key={fact}>{fact}</li>)}</ul>
            {finding?.question && <p>{finding.question}</p>}
            {item.available && <Link className="inline-flex min-h-11 items-center text-sm underline" href={`/rankings/${hs6}/${item.row.reporter}?snapshot=${release.id}&to=${period}`}>Verify {item.name} figures</Link>}
          </article>;
        })}
      </section>
      {questions}
      <Link className="inline-flex min-h-11 items-center font-semibold text-brand-strong underline" href={comparisonUrl}>Back to market comparison</Link>
    </>;
  }

  return <>
    {header(example)}
    {source}
    {(release.stale || (latest && new Date().getUTCFullYear() - Number(latest) > 1)) && <p className="text-sm">This release contains older observations. Check for newer data before making a decision.</p>}
    {loadNotice}
    <section className="space-y-3" aria-labelledby="market-comparison">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h2 id="market-comparison" className="section-title">{second ? "Market comparison" : "Market overview"}</h2>
        <div className="flex flex-wrap gap-x-4 text-sm font-semibold text-brand-strong">
          <a href="#destinations" className="inline-flex min-h-11 items-center underline underline-offset-4">Change market</a>
          <Link href={`${comparisonUrl}&view=assistant`} className="inline-flex min-h-11 items-center underline underline-offset-4">AI research</Link>
        </div>
      </div>
      {second && <p data-explainable>
        {bigger ? `${bigger.name} reported the larger import value in ${period}.` :
          comparable ? `Import values were equal in ${period}.` : `Import values could not be compared for ${period}.`}
        {" "}{higherChange ? `${higherChange.name} had the higher year-on-year change (${metric(higherYear.annualChange, "%", true)}).` :
          recentChanges ? "The year-on-year change was the same." : "Year-on-year change could not be compared."}
      </p>}
      <BeginnerMarketComparison markets={markets} period={period} snapshot={release.id} />
      <p className="text-sm text-secondary">Calculated from destination-reported UN Comtrade imports. {eligible} of {ranking.rankings.length} markets had comparable ranking data. Share change is in percentage points (pp).</p>
      <Link href={rankedUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong underline">View all market rankings</Link>
    </section>
    <details className="surface px-4">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-brand-strong">Compare markets or change trade year</summary>
      <div className="pb-4">{filters}</div>
    </details>
    {destinations}
  </>;
}

export default function BeginnerMarketPage(props: Props) {
  return <RankingShell beginner><Suspense fallback={<ResearchSkeleton label="Loading market data" />}><MarketResearch {...props} /></Suspense></RankingShell>;
}
