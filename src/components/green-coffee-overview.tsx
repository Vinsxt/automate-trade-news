import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { metric, usd } from "@/lib/trade/beginner-market";
import { coffeeOutlookEvidence, coffeeOverview, fallbackCoffeeOutlook } from "@/lib/trade/coffee-outlook";
import { EXPLANATION_MODEL } from "@/lib/trade/ranked-explanation";
import { readRankedImportSeries } from "@/lib/trade/ranked-reader";
import { AiAnalysisPanel } from "./ai-analysis-panel";
import type { RankedRelease } from "@/lib/trade/ranked-snapshot";

export async function GreenCoffeeOverview({ ranking, snapshot }: { ranking: RankedRelease; snapshot: string }) {
  const series = await readRankedImportSeries(snapshot).catch(() => null);
  if (!series) return <p role="status" className="text-sm text-secondary">The leading-market overview is temporarily unavailable.</p>;

  const overview = coffeeOverview(ranking, series);
  const { leaders, markets, periods, screened } = overview;
  if (leaders.length < 3) return <p role="status" className="text-sm text-secondary">At least three complete import histories are needed to compare leading markets.</p>;
  const evidence = coffeeOutlookEvidence(overview, EXPLANATION_MODEL);
  const end = Number(periods.at(-1));

  return <section aria-labelledby="coffee-leaders" className="surface space-y-4 p-4 sm:p-6">
    <div className="space-y-2">
      <h2 id="coffee-leaders" className="section-title">Leading green coffee importers</h2>
      <p className="text-sm text-muted">Top three by total import value in {periods[0]}–{end}, among the {markets.length} of {screened} covered markets with complete data. Totals include imports from all suppliers.</p>
    </div>
    <ol className="grid divide-y divide-line rounded-lg border border-line bg-surface-subtle sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {leaders.map((market, index) => {
        const rank = index > 0 && market.total === leaders[index - 1].total ? leaders.findIndex(item => item.total === market.total) + 1 : index + 1;
        return <li key={market.reporter} className="min-w-0">
          <Link href={`/mulai/090111?snapshot=${snapshot}&market=${market.reporter}`}
            className="interactive-row grid h-full grid-cols-[1fr_auto] items-center gap-x-2 px-3 py-2.5 hover:bg-brand-light sm:block sm:p-4">
            <span className="flex min-w-0 items-center justify-between gap-2 text-sm font-semibold text-ink">
              <span><span className="mr-1.5 tabular-nums text-secondary">{rank}.</span>{market.name}</span><ArrowUpRight size={15} className="hidden shrink-0 text-muted sm:block" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tabular-nums text-ink sm:mt-3 sm:block sm:text-xl sm:tracking-tight">{usd(market.total)}</span>
            <span className="col-span-2 mt-1 block text-xs text-secondary">{market.latestChange === null ? `${end} change unavailable` :
              `${metric(market.latestChange, "%", true)} in ${end} vs. ${end - 1}`}</span>
          </Link>
        </li>;
      })}
    </ol>
    <AiAnalysisPanel key={snapshot} endpoint={`/api/ai/coffee-outlook/${snapshot}`} periodLabel={`${end + 1} outlook`}
      fallback={{ state: "data", sections: fallbackCoffeeOutlook(evidence), coverage: evidence.period, generatedAt: null }} />
  </section>;
}
