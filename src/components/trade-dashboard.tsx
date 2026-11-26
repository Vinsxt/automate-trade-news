import type { ReactNode } from "react";
import { LazyImportValueChart } from "./lazy-import-value-chart";
import { MOVEMENT_THRESHOLDS } from "@/lib/analytics/trade";
import type { PilotDashboardData } from "@/lib/trade/dashboard";

const COUNTRY_NAMES: Record<number, string> = {
  0: "World total",
  116: "Cambodia",
  156: "China",
  208: "Denmark",
  231: "Ethiopia",
  251: "France",
  276: "Germany",
  344: "Hong Kong",
  360: "Indonesia",
  372: "Ireland",
  380: "Italy",
  392: "Japan",
  418: "Lao PDR",
  490: "Other Asia, nes",
  608: "Philippines",
  699: "India",
  702: "Singapore",
  704: "Viet Nam",
  724: "Spain",
  757: "Switzerland",
  764: "Thailand",
  784: "United Arab Emirates",
  792: "Türkiye",
  842: "United States",
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  notation: "compact",
});

const exactMoney = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function countryName(code: number, iso: string | null) {
  return COUNTRY_NAMES[code] ?? iso ?? `Partner ${code}`;
}

function TrendValue({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">Unavailable</span>;
  return <span className={value >= 0 ? "text-success-ink" : "text-destructive"}>{value >= 0 ? "+" : ""}{percent.format(value)}%</span>;
}

function ShareChange({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">Unavailable</span>;
  return <span className={value >= 0 ? "text-success-ink" : "text-destructive"}>{value >= 0 ? "+" : ""}{percent.format(value)} pp</span>;
}

export function TradeDashboard({ dashboard, marketName = "India", context }: { dashboard: PilotDashboardData; marketName?: string; context?: ReactNode }) {
  const latest = dashboard.imports.at(-1);
  const chartData = dashboard.imports.map(({ period, importValue, netWeightKg }) =>
    ({ period, value: importValue, netWeightKg }));
  const indonesia = dashboard.latestSuppliers.find(({ partnerCode }) => partnerCode === 360);
  const latestValue = latest?.importValue ?? null;

  return (
    <>
      <section className="surface grid overflow-hidden divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0" aria-label="Market indicators">
        <article className="bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Latest import value · {latest?.period ?? "—"}</p>
          <p className="metric-value mt-2">{latestValue === null ? "—" : money.format(latestValue)}</p>
          <p className="mt-2 text-xs text-muted">Primary trade value · USD</p>
        </article>
        <article className="bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Year-over-year value change</p>
          <p className="metric-value mt-2"><TrendValue value={latest?.yearOverYearPct ?? null} /></p>
          <p className="mt-2 text-xs text-muted">Only shown for consecutive years with a non-zero prior value</p>
        </article>
        <article className="bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Partner records · {latest?.period ?? "—"}</p>
          <p className="metric-value mt-2">{dashboard.latestSuppliers.length}</p>
          <p className="mt-2 text-xs text-muted">Rows currently stored for this annual period</p>
        </article>
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="trend-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Market overview</p>
            <h2 id="trend-title" className="section-title">Import value by year</h2>
          </div>
          <span className="border border-line px-2.5 py-1 text-xs text-secondary">USD · import perspective</span>
        </div>
        {chartData.some(({ value }) => value !== null) ? (
          <>
            <div className="mt-4">
              <LazyImportValueChart data={chartData.map(item => ({ period: item.period, values: [item.value] }))} series={[marketName]} />
            </div>
            <details className="mt-3 text-sm text-secondary">
              <summary className="w-fit cursor-pointer underline decoration-control underline-offset-4">View chart data table</summary>
              <table className="mt-3 w-full max-w-md text-left text-sm">
                <caption className="sr-only">Annual imports in United States dollars</caption>
                <thead><tr><th scope="col" className="py-2">Year</th><th scope="col" className="py-2 text-right">Import value · USD</th><th scope="col" className="py-2 text-right">Net weight · kg</th></tr></thead>
                <tbody>{chartData.map((item) => <tr key={item.period} className="border-t border-line"><th scope="row" className="py-2 text-left font-normal">{item.period}</th><td className="py-2 text-right tabular-nums">{item.value === null ? "Unavailable" : exactMoney.format(item.value)}</td><td className="py-2 text-right tabular-nums">{item.netWeightKg === null ? "Unavailable" : percent.format(item.netWeightKg)}</td></tr>)}</tbody>
              </table>
            </details>
          </>
        ) : (
          <div className="mt-5 grid min-h-56 place-items-center border border-dashed border-line bg-surface-subtle px-6 text-center">
            <div>
              <p className="font-medium text-ink">No annual records loaded</p>
              <p className="mt-1 text-sm text-secondary">Choose another year range or check again when a new snapshot is published.</p>
            </div>
          </div>
        )}
      </section>

      {context}

      <section className="surface overflow-hidden" aria-labelledby="suppliers-title">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Supplier comparison</p>
            <h2 id="suppliers-title" className="section-title">Partner markets · {latest?.period ?? "—"}</h2>
          </div>
          <p className="text-xs text-muted">Market share uses the destination’s World total</p>
        </div>
        <p className="px-5 pt-3 text-xs text-muted lg:hidden">Scroll the table to see all supplier metrics.</p>
        <div tabIndex={0} role="region" aria-labelledby="suppliers-title" className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <caption className="sr-only">Supplier import values, market shares, and share changes for {marketName}</caption>
            <thead className="bg-surface-subtle text-xs uppercase tracking-wide text-secondary">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium sm:px-6">Rank / partner</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Import value</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Value change</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Rank change</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Share</th>
                <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">Change · pp</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Unit value · USD/kg</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Value with usable weight</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Indonesia vs. supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {dashboard.latestSuppliers.map((supplier) => (
                <tr key={supplier.partnerCode} className={supplier.partnerCode === 360 ? "bg-surface-subtle" : "hover:bg-surface-subtle"}>
                  <th scope="row" className="px-5 py-3.5 text-left font-normal sm:px-6">
                    <span className="mr-3 inline-block w-5 text-xs text-muted">{supplier.rank}</span>
                    <span className="font-medium text-ink">{countryName(supplier.partnerCode, supplier.partnerIso)}</span>
                    <span className="ml-2 text-xs text-muted">{supplier.partnerIso ?? `M49 ${supplier.partnerCode}`}</span>
                  </th>
                  <td className="px-4 py-3.5 text-right tabular-nums text-secondary">{money.format(supplier.importValue)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{supplier.importValueChange === null ? "—" : money.format(supplier.importValueChange)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{supplier.rankChange === null ? "—" : supplier.rankChange > 0 ? `+${supplier.rankChange}` : supplier.rankChange}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-secondary">{supplier.marketSharePct === null ? "—" : `${percent.format(supplier.marketSharePct)}%`}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums sm:px-6"><ShareChange value={supplier.shareChangePp} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{supplier.unitValueUsdPerKg == null ? "Unavailable" : percent.format(supplier.unitValueUsdPerKg)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{supplier.unitValueCoveragePct == null ? "Unavailable" : `${percent.format(supplier.unitValueCoveragePct)}%`}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{supplier.indonesiaUnitValueGapPct == null ? "—" : `${percent.format(supplier.indonesiaUnitValueGapPct)}%`}</td>
                </tr>
              ))}
              {!dashboard.latestSuppliers.length && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-muted">Supplier data is unavailable for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="surface bg-surface-subtle p-5">
          <h2 className="font-semibold text-ink">Movements to investigate</h2>
          <p className="mt-2 text-sm text-secondary">
            Flags require a year-over-year change of at least {MOVEMENT_THRESHOLDS.importValuePct}% in import value
            or {MOVEMENT_THRESHOLDS.supplierSharePp} percentage points in a supplier’s share.
          </p>
          {dashboard.movements.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-secondary">
              {dashboard.movements.map((movement) => (
                <li key={movement.kind === "import_value" ? movement.kind : movement.partnerCode}>
                  {movement.kind === "import_value" ? (
                    <>Total import value <TrendValue value={movement.change} /></>
                  ) : (
                    <>{countryName(movement.partnerCode, movement.partnerIso)} share <ShareChange value={movement.change} /></>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-secondary">No available comparison met either threshold.</p>
          )}
        </article>
        <article className="surface p-5">
          <h2 className="font-semibold text-ink">Indonesia’s supplier position · {latest?.period ?? "—"}</h2>
          {indonesia ? (
            <p className="mt-2 text-sm text-secondary">
              Rank {indonesia.rank} of {dashboard.latestSuppliers.length} reported partners · {money.format(indonesia.importValue)} in imports
              {indonesia.marketSharePct === null ? " · Share unavailable" : ` · ${percent.format(indonesia.marketSharePct)}% of ${marketName}’s imports`}
              {" · "}<ShareChange value={indonesia.shareChangePp} />
            </p>
          ) : (
            <p className="mt-2 text-sm text-secondary">No supplier value was available for Indonesia in this year.</p>
          )}
        </article>
        <article className="surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Data coverage</p>
          <p className="mt-2 text-sm leading-6 text-secondary">
            {dashboard.observationCount} source rows in this period range. {dashboard.publishedAt
              ? `Snapshot published ${new Date(dashboard.publishedAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}.`
              : "No completed retrieval is recorded yet."}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">Source flags: isReported=false on {dashboard.sourceFlags.notReported} rows; isAggregate=true on {dashboard.sourceFlags.aggregate} rows.</p>
          <p className="mt-2 text-xs leading-5 text-muted">Missing partner rows are not treated as zero. Changes compare consecutive available years only.</p>
        </article>
      </section>
    </>
  );
}
