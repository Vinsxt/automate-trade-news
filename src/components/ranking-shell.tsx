import Link from "next/link";
import type { ReactNode } from "react";

export function RankingShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-5 py-8 sm:px-8">
      <nav aria-label="Trade research" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-stone-300 pb-4 text-sm font-semibold text-emerald-900">
        <Link href="/rankings">Opportunity ranking</Link>
        <Link href="/methodology">Methodology</Link>
        <Link href="/pilot">India solar pilot</Link>
      </nav>
      {children}
    </main>
  );
}

export const formatNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function SnapshotDate({ publishedAt, stale }: { publishedAt: string; stale: boolean }) {
  const date = new Date(publishedAt);
  return <span>Published <time dateTime={publishedAt}>{date.toISOString().slice(0, 10)} UTC</time>{stale && " · Over one year old"}</span>;
}
