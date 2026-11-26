import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { ExportGlobe } from "@/components/export-globe";
import { Button } from "@/components/ui/button";
import { TradeHeader } from "@/components/trade-header";
import { PRODUCT_GROUPS, TRADE_SOURCES } from "@/lib/trade/beginner-catalog";
import { MARKETS, PRODUCTS, COHORT_PERIODS } from "@/lib/trade/cohort";

const productLabels: Record<string, string> = {
  "090111": "Green coffee",
  "151190": "Other palm oil and fractions",
  "180400": "Cocoa butter, fat and oil",
  "180500": "Unsweetened cocoa powder",
  "400122": "Natural rubber, technically specified",
  "401110": "Passenger car tyres",
  "610910": "Knitted cotton T-shirts and vests",
  "620342": "Woven cotton trousers for men and boys",
  "640399": "Leather-upper footwear",
  "640411": "Textile-upper sports footwear",
  "940360": "Other wooden furniture",
};

export default function Home() {
  return <div className="landing-page relative isolate min-h-screen w-full" data-landing>
    <ExportGlobe />
    <TradeHeader />
    <main id="main-content" tabIndex={-1} className="relative z-10">
      <section className="landing-hero mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12" data-landing-hero>
        <div className="landing-intro">
          <h1>Find your next export market.</h1>
          <p>Explore where Indonesian products are imported, how imports change, and who already supplies each market.</p>
          <Button asChild size="lg" className="mt-7 gap-4">
            <a href="#products">Browse products <ArrowDown size={17} aria-hidden="true" /></a>
          </Button>
        </div>
        <p className="landing-map-key"><span aria-hidden="true" />Indonesia highlighted</p>
      </section>

      <section id="products" className="landing-catalog scroll-mt-5">
        <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="landing-catalog-title">Explore the catalog</h2>
              <p className="mt-2 text-secondary">Choose a product to see its destination markets.</p>
            </div>
            <p className="text-sm font-medium text-secondary">
              {Object.keys(PRODUCTS).length} products · {Object.keys(MARKETS).length} markets · {COHORT_PERIODS[0]}–{COHORT_PERIODS.at(-1)}
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {PRODUCT_GROUPS.map(group => <section key={group.name} className="landing-category min-w-0 overflow-hidden">
              <div className="relative aspect-[3/1] overflow-hidden bg-surface-subtle">
                <Image src={group.image} alt="" fill sizes="(min-width: 1320px) 395px, (min-width: 1024px) 33vw, 100vw" className="object-cover" />
              </div>
              <h3 className="px-5 pb-3 pt-5 landing-category-title">{group.name}</h3>
              <ul className="px-3 pb-3">
                {group.codes.map(hs6 => <li key={hs6} className="border-t border-line">
                  <Link href={`/mulai/${hs6}`} title={PRODUCTS[hs6]} className="interactive-row group flex min-h-15 items-center justify-between gap-3 rounded-md px-2 py-2.5">
                    <span>
                      <span className="block text-sm font-semibold leading-snug text-ink">{productLabels[hs6] ?? PRODUCTS[hs6]}</span>
                      <span className="mt-1 block text-xs tabular-nums text-muted group-hover:text-secondary group-active:text-secondary">HS {hs6}</span>
                    </span>
                    <ArrowUpRight size={17} className="shrink-0 text-brand-strong" aria-hidden="true" />
                  </Link>
                </li>)}
              </ul>
            </section>)}
          </div>
        </div>
      </section>
    </main>
    <footer className="landing-footer relative z-10">
      <div className="mx-auto flex w-full max-w-[1320px] flex-wrap justify-between gap-2 px-5 py-6 text-sm sm:px-8 lg:px-12">
        <p>Annual import data from <a className="underline underline-offset-4" href={TRADE_SOURCES.comtrade.href}>UN Comtrade</a>.</p>
        <Link className="underline underline-offset-4" href="/methodology">How the data is calculated</Link>
      </div>
    </footer>
  </div>;
}
