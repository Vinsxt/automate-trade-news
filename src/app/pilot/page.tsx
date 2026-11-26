import Link from "next/link";
import { Suspense } from "react";

import { RankingShell } from "@/components/ranking-shell";
import { ResearchSkeleton } from "@/components/research-skeleton";
import { TradeDashboard } from "@/components/trade-dashboard";
import { TradeSelection } from "@/components/trade-selection";
import { PILOT_QUERY } from "@/lib/trade/pilot";
import { tradeSelectionSchema, type TradeSelection as Selection } from "@/lib/validations/trade-selection";
import { SupabaseReaderConfigurationError } from "@/lib/supabase/reader";
import { getPilotDashboardData, type PilotDashboardData } from "@/lib/trade/dashboard";

async function loadDashboard(selection: Selection): Promise<
  | { data: PilotDashboardData; unavailable: false }
  | { data: null; unavailable: boolean }
> {
  try {
    return { data: await getPilotDashboardData(selection), unavailable: false };
  } catch (error) {
    return { data: null, unavailable: error instanceof SupabaseReaderConfigurationError };
  }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function DashboardContent({ searchParams }: { searchParams: SearchParams }) {
  const parsed = tradeSelectionSchema.safeParse(await searchParams);
  const selection = parsed.success ? parsed.data : {};
  const result = await loadDashboard(selection);
  const error = parsed.success ? undefined : "Choose the supported product and market. The start year must be on or before the end year.";

  return (
    <>
      <TradeSelection selection={selection} availablePeriods={result.data?.availablePeriods ?? []} error={error} />
      <div className="grid gap-6">
        <div className="min-w-0 space-y-6">
          {result.data ? <TradeDashboard dashboard={result.data} /> : (
            <section className="border border-warning/35 bg-warning-tint p-6" role="status">
              <h2 className="text-lg font-semibold text-warning">{result.unavailable ? "Trade data is not connected yet" : "Could not load trade data"}</h2>
              <p className="mt-2 text-sm text-secondary">Check the Supabase connection and reload this page.</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <RankingShell>
      <Link href="/rankings" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong underline underline-offset-4">Market rankings</Link>
      <section id="overview" className="grid gap-5 py-2 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">Trade monitor / solar supply chain</p>
          <h1 className="page-title">
            India’s imports of photovoltaic cells
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
            Track import value and supplier mix for HS 854142, cells not assembled in modules or panels.
            The pilot compares India’s imports by partner.
          </p>
        </div>
        <div className="border-l-2 border-brand pl-4 text-sm leading-6 text-secondary">
          <p className="font-semibold text-ink">Selected market</p>
          <p>{PILOT_QUERY.reporterName} · Reporter {PILOT_QUERY.reporterCode} · Imports</p>
          <p>{PILOT_QUERY.classificationLabel} · HS {PILOT_QUERY.cmdCode} · Annual</p>
          <p>Source: UN Comtrade</p>
        </div>
      </section>

      <Suspense fallback={<ResearchSkeleton label="Loading trade data" />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>

      <footer className="mt-10 flex flex-col gap-2 border-t border-line pt-4 text-xs leading-5 text-secondary sm:flex-row sm:justify-between">
        <p>Descriptive trade statistics only · Value changes do not establish physical volume or causation.</p>
        <p>UN Comtrade · {PILOT_QUERY.classificationLabel} · Import perspective</p>
      </footer>
    </RankingShell>
  );
}
