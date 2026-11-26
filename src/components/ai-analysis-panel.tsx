"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { CoffeeAnalysisView } from "@/lib/ai/coffee-analysis";
import { withMinimumLoading } from "@/lib/ai/minimum-loading";

export function AiAnalysisPanel({ endpoint, periodLabel, fallback, minimumLoadingMs = 1500 }: {
  endpoint: string;
  periodLabel: string;
  fallback: CoffeeAnalysisView;
  minimumLoadingMs?: number;
}) {
  const panelId = useId();
  const active = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CoffeeAnalysisView | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  async function request() {
    if (active.current) return;
    if (open) {
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setOpen(true);
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await withMinimumLoading(async () => {
        const response = await fetch(endpoint, { method: "POST", signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Analysis unavailable");
        return await response.json() as CoffeeAnalysisView;
      }, minimumLoadingMs, controller.signal);
      if (!controller.signal.aborted) setAnalysis(result);
    } catch {
      if (!controller.signal.aborted) setAnalysis(fallback);
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setLoading(false);
      }
    }
  }

  return <div className="overflow-hidden rounded-xl border border-line bg-surface">
    <button type="button" aria-expanded={open} aria-controls={panelId} aria-disabled={loading || undefined}
      className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 bg-intelligence-tint px-3 py-2.5 text-left text-sm font-semibold text-intelligence-ink hover:bg-intelligence/15 focus-visible:outline-offset-[-3px] aria-disabled:cursor-wait sm:px-4"
      onClick={request}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-intelligence text-primary-foreground"><Sparkles size={16} aria-hidden="true" /></span> Predict with AI
      <span className="ml-auto font-normal text-secondary">{periodLabel}</span>
      <ChevronDown size={16} className={`shrink-0 motion-safe:transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    <div id={panelId} hidden={!open} className="border-t border-line">
      <p role="status" className={loading ? "flex min-h-20 items-center gap-3 bg-surface px-4 py-5 text-sm font-medium text-ink" : "sr-only"}>
        {loading ? <><span aria-hidden="true" className="ai-spinner" />Preparing AI insights…</>
          : analysis ? "Outlook ready." : ""}
      </p>
      {analysis && <div className="analysis-reveal space-y-4 p-4 text-sm leading-relaxed">
        <p className="text-muted">
          {analysis.state === "outdated" && <strong>Outdated analysis · </strong>}
          {analysis.state === "data" && <strong>AI unavailable · Data-based outlook · </strong>}
          {analysis.generatedAt && <>Generated <time dateTime={analysis.generatedAt}>{new Date(analysis.generatedAt).toISOString().slice(0, 10)} UTC</time> · </>}
          UN Comtrade data {analysis.coverage}
        </p>
        <dl className="grid gap-4 sm:grid-cols-3">
          {["Where imports could stay strong", "Market potential", "What could change the outlook"].map((label, index) => <div key={label} className="border-t border-line pt-3">
            <dt className="font-semibold text-ink">{label}</dt>
            <dd className="mt-1">{analysis.sections[index]}</dd>
          </div>)}
        </dl>
        <p className="text-muted">This one-year outlook uses historical USD trade values. Import trends can guide market research; estimating sales requires buyer and supplier information.</p>
      </div>}
    </div>
  </div>;
}
