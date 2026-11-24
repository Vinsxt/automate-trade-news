import { Suspense } from "react";

import { ImportControls } from "@/components/import-controls";
import { TradeDashboard } from "@/components/trade-dashboard";
import { TradeSelection } from "@/components/trade-selection";
import { PILOT_QUERY } from "@/lib/trade/pilot";
import { tradeSelectionSchema, type TradeSelection as Selection } from "@/lib/validations/trade-selection";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";
import { getPilotDashboardData, type PilotDashboardData } from "@/lib/trade/dashboard";

async function loadDashboard(selection: Selection): Promise<
  | { data: PilotDashboardData; unavailable: false }
  | { data: null; unavailable: boolean }
> {
  try {
    return { data: await getPilotDashboardData(selection), unavailable: false };
  } catch (error) {
    return { data: null, unavailable: error instanceof SupabaseConfigurationError };
  }
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function DashboardContent({ searchParams }: { searchParams: SearchParams }) {
  const parsed = tradeSelectionSchema.safeParse(await searchParams);
  const selection = parsed.success ? parsed.data : {};
  const result = await loadDashboard(selection);
  const error = parsed.success ? undefined : "Choose the supported product and market. The start year must be on or before the end year.";
  const latestExplainablePeriod = result.data?.imports.findLast(({ importValue }) => importValue !== null)?.period ?? null;

  return (
    <>
      <TradeSelection selection={selection} availablePeriods={result.data?.availablePeriods ?? []} error={error} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {result.data ? <TradeDashboard dashboard={result.data} /> : (
            <section className="border border-amber-300 bg-amber-50 p-6" role="status">
              <h2 className="text-lg font-semibold text-stone-950">{result.unavailable ? "Trade data is not connected yet" : "Could not load trade data"}</h2>
              <p className="mt-2 text-sm text-stone-700">Check the Supabase connection and reload this page.</p>
            </section>
          )}
        </div>
        <ImportControls key={latestExplainablePeriod ?? "unavailable"} explanationPeriod={latestExplainablePeriod} />
      </div>
    </>
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 pb-5">
        <a href="#overview" className="flex items-center gap-3 text-stone-900 no-underline">
          <span className="grid size-9 place-items-center bg-emerald-900 text-sm font-bold text-white">GT</span>
          <span className="text-sm font-semibold tracking-wide">GLOBAL TRADE INTELLIGENCE</span>
        </a>
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
          <span className="size-2 rounded-full bg-amber-500" />
          Pilot workspace
        </span>
      </header>

      <section id="overview" className="grid gap-7 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Trade monitor / solar supply chain</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-5xl">
            India’s imports of photovoltaic cells
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
            Track import value and supplier mix for HS 854142, cells not assembled in modules or panels.
            The pilot compares India’s imports by partner.
          </p>
        </div>
        <div className="border-l-2 border-emerald-800 pl-4 text-sm leading-6 text-stone-600">
          <p className="font-semibold text-stone-900">Selected market</p>
          <p>{PILOT_QUERY.reporterName} · Reporter {PILOT_QUERY.reporterCode} · Imports</p>
          <p>{PILOT_QUERY.classificationLabel} · HS {PILOT_QUERY.cmdCode} · Annual</p>
          <p>Source: UN Comtrade</p>
        </div>
      </section>

      <Suspense fallback={<div className="grid min-h-64 place-items-center border border-stone-300 bg-white text-sm text-stone-500" role="status">Loading trade data…</div>}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>

      <footer className="mt-10 flex flex-col gap-2 border-t border-stone-300 pt-4 text-xs leading-5 text-stone-500 sm:flex-row sm:justify-between">
        <p>Descriptive trade statistics only · Value changes do not establish physical volume or causation.</p>
        <p>UN Comtrade · {PILOT_QUERY.classificationLabel} · Import perspective</p>
      </footer>
    </main>
  );
}
