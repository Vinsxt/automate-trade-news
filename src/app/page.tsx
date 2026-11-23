import { Suspense } from "react";

import { ImportControls } from "@/components/import-controls";
import { TradeDashboard } from "@/components/trade-dashboard";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";
import { getPilotDashboardData, type PilotDashboardData } from "@/lib/trade/dashboard";

async function loadDashboard(): Promise<
  | { data: PilotDashboardData; unavailable: false }
  | { data: null; unavailable: boolean }
> {
  try {
    return { data: await getPilotDashboardData(), unavailable: false };
  } catch (error) {
    return { data: null, unavailable: error instanceof SupabaseConfigurationError };
  }
}

async function DashboardContent() {
  const result = await loadDashboard();
  if (!result.data) {
    const databaseUnavailable = result.unavailable;
    return (
      <section className="border border-amber-300 bg-amber-50 p-6" role="status">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-900">{databaseUnavailable ? "Database connection needed" : "Data unavailable"}</p>
        <h2 className="mt-2 text-xl font-semibold text-stone-950">{databaseUnavailable ? "Trade data is not connected yet" : "Could not load trade data"}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-700">{databaseUnavailable
          ? <>Add the Supabase service key to the ignored <code>.env.local</code> file, then restart the dev server. No keys are included in this page or browser bundle.</>
          : "Check the Supabase connection and local server logs, then reload this page."}
        </p>
      </section>
    );
  }
  return <TradeDashboard dashboard={result.data} />;
}

export default function Home() {
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
          <p>India · Reporter 699 · Imports</p>
          <p>HS 2017 · HS 854142 · Annual</p>
          <p>Source: UN Comtrade</p>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Suspense fallback={<div className="grid min-h-64 place-items-center border border-stone-300 bg-white text-sm text-stone-500" role="status">Loading trade data…</div>}>
            <DashboardContent />
          </Suspense>
        </div>

        <ImportControls />
      </div>

      <footer className="mt-10 flex flex-col gap-2 border-t border-stone-300 pt-4 text-xs leading-5 text-stone-500 sm:flex-row sm:justify-between">
        <p>Descriptive trade statistics only · Value changes do not establish physical volume or causation.</p>
        <p>UN Comtrade · HS 2017 · Import perspective</p>
      </footer>
    </main>
  );
}
