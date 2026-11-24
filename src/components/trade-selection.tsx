import { PILOT_QUERY } from "@/lib/trade/pilot";
import type { TradeSelection as Selection } from "@/lib/validations/trade-selection";

interface Props {
  selection: Selection;
  availablePeriods: string[];
  error?: string;
}

export function TradeSelection({ selection, availablePeriods, error }: Props) {
  const periods = [...new Set([
    ...(availablePeriods.length ? availablePeriods : PILOT_QUERY.periods),
    ...[selection.from, selection.to].filter((year) => year !== undefined),
  ])].sort();
  const fieldClass = "mt-1 block min-h-12 w-full rounded border border-stone-500 bg-white px-3 text-base text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800";

  return (
    <search className="mb-6 border border-stone-300 bg-white p-5">
      <h2 id="trade-filters" className="mb-4 text-lg font-semibold text-stone-950">Market and period</h2>
      <form action="/pilot" method="get" aria-labelledby="trade-filters" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto] xl:items-end">
        <label className="text-sm font-medium">
          HS product
          <select name="product" className={fieldClass} defaultValue={selection.product ?? PILOT_QUERY.cmdCode}>
            <option value={PILOT_QUERY.cmdCode}>{PILOT_QUERY.cmdCode} · Photovoltaic cells</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Importing market
          <select name="market" className={fieldClass} defaultValue={selection.market ?? String(PILOT_QUERY.reporterCode)}>
            <option value={PILOT_QUERY.reporterCode}>{PILOT_QUERY.reporterName}</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          From year
          <select name="from" className={fieldClass} defaultValue={selection.from ?? periods[0]}>
            {periods.map((year) => <option key={year}>{year}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          To year
          <select name="to" className={fieldClass} defaultValue={selection.to ?? periods.at(-1)} aria-describedby={error ? "selection-error" : undefined} aria-invalid={error ? true : undefined}>
            {periods.map((year) => <option key={year}>{year}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-12 rounded bg-emerald-900 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
          Apply filters
        </button>
        {error && <p id="selection-error" role="alert" className="text-sm text-red-800 md:col-span-2 xl:col-span-5">{error}</p>}
      </form>
    </search>
  );
}
