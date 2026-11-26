import Link from "next/link";
import { LazyImportValueChart } from "./lazy-import-value-chart";
import { metric, usd, type BeginnerMarket } from "@/lib/trade/beginner-market";

export function BeginnerMarketComparison({ markets, period, snapshot }: {
  markets: BeginnerMarket[];
  period: string;
  snapshot: string;
}) {
  const chart = (markets[0]?.years ?? []).map(year => ({
    period: year.period,
    values: markets.map(market => market.years.find(item => item.period === year.period)?.importValue ?? null),
  }));
  return <div className="surface divide-y divide-line">
    {chart.some(row => row.values.some(value => value !== null)) && <section className="space-y-3 p-4 sm:p-5" aria-labelledby="comparison-history">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="comparison-history" className="section-title">Import history</h3>
        <span className="meta-label">USD · {chart[0].period}–{chart.at(-1)?.period}</span>
      </div>
      <ul aria-label="Chart legend" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {markets.map((market, index) => <li key={market.row.reporter} className="flex items-center gap-2">
          <span aria-hidden="true" className={`w-4 border-t-2 ${index === 0 ? "border-[var(--chart-primary)]" : "border-dashed border-[var(--chart-secondary)]"}`} />{market.name}
        </li>)}
      </ul>
      <LazyImportValueChart data={chart} series={markets.map(market => market.name)} />
    </section>}
    {markets.map(market => {
      const { row, name } = market;
      const year = market.years.find(item => item.period === period)!;
      const window = `${row.referenceYear - 3}–${row.referenceYear}`;
      const detailUrl = `/rankings/${row.hs6}/${row.reporter}?snapshot=${snapshot}&to=${period}`;
      return <article key={row.reporter} className="space-y-3 px-4 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="text-xl font-semibold">{name}</h3>
          <p className="text-sm text-secondary">{market.rank === null ? "Unranked" : `Rank ${market.rank}${market.tied ? " (tie)" : ""} of ${row.eligibleCount}`} · {window}</p>
        </div>
        <dl data-explainable data-market={row.reporter} className="grid grid-cols-2 gap-4 rounded-lg bg-surface-subtle p-3 text-sm sm:grid-cols-4">
          <div><dt className="text-secondary">{period} imports</dt><dd className="metric-value mt-1">{year.importValue === null ? "Unavailable" : usd(year.importValue)}</dd></div>
          <div><dt className="text-secondary">vs. {Number(period) - 1}</dt><dd className="metric-value mt-1">{metric(year.annualChange, "%", true)}</dd></div>
          <div><dt className="text-secondary">Annual growth · {window}</dt><dd className="metric-value mt-1">{metric(row.components?.importGrowth ?? null, "%", true)}</dd></div>
          <div><dt className="text-secondary">Indonesia’s share change · {window}</dt><dd className="metric-value mt-1">{metric(row.components?.indonesiaShareGain ?? null, " pp", true)}</dd></div>
        </dl>
        {market.exclusion && <p className="text-sm">{market.exclusion}</p>}
        {!market.available && <p className="text-sm">Annual records for this market are unavailable.</p>}
        {market.available && <details>
          <summary className="min-h-11 cursor-pointer pt-2 text-sm font-semibold text-brand-strong">View {name} history and suppliers</summary>
          <div className="space-y-4 text-sm">
            <table className="w-full max-w-lg text-left">
              <caption className="sr-only">{name} import history</caption>
              <thead><tr className="border-b border-line"><th scope="col" className="pb-1">Year</th><th scope="col" className="pb-1">Imports</th><th scope="col" className="pb-1">Year on year</th></tr></thead>
              <tbody>{market.years.map(item => <tr key={item.period} className="border-b border-line">
                <th scope="row" className="py-2 font-normal">{item.period}</th>
                <td>{item.importValue === null ? "Unavailable" : usd(item.importValue)}</td>
                <td>{metric(item.annualChange, "%", true)}</td>
              </tr>)}</tbody>
            </table>
            <section data-explainable data-market={row.reporter} className="space-y-1">
              <h4 className="font-semibold">Largest identified suppliers in {period}</h4>
              {year.suppliers.length ? <ul>{year.suppliers.map(supplier => <li key={supplier.partnerCode}>
                {supplier.name} · {usd(supplier.importValue)}{supplier.share === null ? "" : ` · ${metric(supplier.share, "%")}`}
              </li>)}</ul> : <p>Supplier records are unavailable.</p>}
              <p>Indonesia’s share in {period}: {metric(year.indonesiaShare, "%")}.</p>
              <p className="text-secondary">Supplier data identifies countries and territories.</p>
            </section>
            <Link href={detailUrl} className="inline-flex min-h-11 items-center font-semibold text-brand-strong underline">Open {name} data and score breakdown</Link>
          </div>
        </details>}
      </article>;
    })}
  </div>;
}
