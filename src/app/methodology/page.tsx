import Link from "next/link";
import { RankingShell } from "@/components/ranking-shell";

export default function MethodologyPage() {
  return <RankingShell>
    <header className="space-y-2"><h1 className="page-title">How the opportunity score works</h1><p>Use the ranking to prioritize export research for a specific HS 2022 product.</p></header>
    <div className="space-y-6 surface p-5 sm:p-7">
      <section className="space-y-2">
        <h2 className="section-title">Three equally weighted signals</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Destination-reported World import value in the reference year, in USD.</li>
          <li>Compound annual import growth from three years earlier, with four comparable annual totals.</li>
          <li>Change in Indonesia’s share over the same window, in percentage points.</li>
        </ol>
        <p>Each signal is ranked within the eligible destinations for one product. The lowest rank receives 0 points, the highest 100, and ties use their average rank. The score averages the three component points. The ranking page lists every screened destination and explains when a score is unavailable.</p>
        <p>In a five-market cohort, finishing fourth in size, fifth in growth and third in Indonesia’s share gain yields 75, 100 and 50 points. The score is 75.</p>
      </section>
      <section className="space-y-2">
        <h2 className="section-title">When a market is unranked</h2>
        <p>A missing World total, a mismatched edition, an unverified conversion or an absent Indonesia row at either endpoint makes the comparison unavailable. A valid reported zero stays zero. For example, a market with four World totals and an absent Indonesia row in the final year is unranked. A product needs at least two eligible markets to receive scores.</p>
      </section>
      <section className="space-y-2">
        <h2 className="section-title">Weight coverage and interpretation</h2>
        <p>Unit value divides import value in USD by positive observed net weight in kilograms. Estimated weights are excluded. For pooled rows, usable weights must cover at least 80% of comparable value. A supplier gap compares Indonesia’s USD/kg with the same-period supplier’s USD/kg. Product mix and valuation can affect both figures.</p>
        <p>The candidate set favors products Indonesia already exports and contains a limited set of markets. Reporting gaps and revisions can change eligibility and ranking. Trade year describes the observation. Publication date identifies the snapshot. Country-level trade data helps prioritize research and cannot identify individual firms or explain the causes of a change.</p>
        <p><a className="underline" href="https://comtradeplus.un.org/">Source: UN Comtrade</a></p>
      </section>
      <p><Link className="underline" href="/pilot">Research example: India solar pilot</Link></p>
    </div>
  </RankingShell>;
}
