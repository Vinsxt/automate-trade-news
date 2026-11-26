import Link from "next/link";
import type { ReactNode } from "react";
import { TradeHeader } from "./trade-header";

export function RankingShell({ children, beginner = false }: { children: ReactNode; beginner?: boolean }) {
  return (
    <>
      <TradeHeader />
      <main id="main-content" tabIndex={-1} className={`mx-auto w-full flex-1 space-y-6 px-4 py-7 sm:px-8 sm:py-10 ${beginner ? "max-w-5xl" : "max-w-6xl"}`}>
      {children}
      <footer className="border-t border-line pt-3 text-sm text-muted"><Link className="inline-flex min-h-11 items-center underline" href="/methodology">Methodology</Link></footer>
      </main>
    </>
  );
}

export const formatNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function SnapshotDate({ publishedAt, stale }: { publishedAt: string; stale: boolean }) {
  const date = new Date(publishedAt);
  return <span>Published <time dateTime={publishedAt}>{date.toISOString().slice(0, 10)} UTC</time>{stale && " · Over one year old"}</span>;
}
