import Link from "next/link";
import { Compass } from "lucide-react";

export function TradeHeader() {
  return <header className="relative z-10 border-b border-line bg-surface">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:rounded focus:bg-surface focus:p-3 focus:text-ink">Skip to content</a>
    <div className="mx-auto flex min-h-15 w-full max-w-[1320px] flex-wrap items-center justify-between gap-x-4 px-4 sm:px-8 lg:px-12">
      <Link href="/" className="inline-flex min-h-12 items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-tight text-brand sm:text-base">
        <span className="grid size-8 place-items-center rounded-lg bg-brand text-background"><Compass size={18} strokeWidth={1.7} aria-hidden="true" /></span>
        Export markets
      </Link>
      <nav aria-label="Main navigation" className="flex gap-x-1 text-xs font-medium text-brand sm:gap-x-4 sm:text-sm">
        <Link className="interactive-row inline-flex min-h-11 items-center rounded-md px-2 sm:px-3" href="/#products">Catalog</Link>
        <Link className="interactive-row inline-flex min-h-11 items-center rounded-md px-2 sm:px-3" href="/methodology">Data guide</Link>
      </nav>
    </div>
  </header>;
}
