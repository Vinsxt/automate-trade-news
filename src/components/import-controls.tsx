"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { TradeExplanation } from "@/lib/gemini/explanation";
import { PILOT_QUERY } from "@/lib/trade/pilot";

const YEARS = [...PILOT_QUERY.periods].reverse();

export function ImportControls({ explanationPeriod }: { explanationPeriod: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [period, setPeriod] = useState<string>(YEARS[0]);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [explanation, setExplanation] = useState<TradeExplanation | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setExplanation(null);
    setAnalysisError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ periods: [period] }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message ?? "Import failed. Check the local server configuration.");
      }
      const { recordsReceived, recordsWritten } = result.data;
      setMessage({ kind: "success", text: `${period}: received ${recordsReceived} records and wrote ${recordsWritten}.` });
      setToken("");
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Import failed. Check the local server configuration.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function explainLatest() {
    if (!explanationPeriod) return;
    if (!token.trim()) {
      setAnalysisError("Enter the local admin token first.");
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    setExplanation(null);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ period: explanationPeriod }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Explanation is temporarily unavailable. Try again shortly.");
      setExplanation(result.data.explanation as TradeExplanation);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Explanation is temporarily unavailable. Try again shortly.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <aside className="border border-stone-300 bg-[#f7f6f1] p-5 lg:sticky lg:top-6">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Data operations</p>
      <h2 id="import-title" className="mt-2 text-xl font-semibold text-stone-950">Load a year</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Fetch India’s partner-level imports for one year. A single-year request keeps the pilot within public preview limits.
      </p>

      <form action="/api/admin/ingest" method="post" aria-labelledby="import-title" className="mt-5 space-y-4" onSubmit={submitImport}>
        <div>
          <label htmlFor="period" className="mb-1.5 block text-sm font-medium text-stone-800">Annual period</label>
          <select
            id="period"
            name="period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="min-h-12 w-full border border-stone-400 bg-white px-3 py-2.5 text-base text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="admin-token" className="mb-1.5 block text-sm font-medium text-stone-800">Local admin token</label>
          <p id="token-help" className="mb-2 text-xs leading-5 text-stone-600">Use the INGEST_ADMIN_TOKEN value in your local .env.local file.</p>
          <input
            id="admin-token"
            type="password"
            name="adminToken"
            autoComplete="current-password"
            aria-describedby="token-help"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste INGEST_ADMIN_TOKEN from .env.local"
            className="min-h-12 w-full border border-stone-400 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          />
        </div>
        <button
          type="submit"
          disabled={busy || analyzing}
          className="w-full bg-emerald-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {busy ? "Fetching from UN Comtrade…" : `Import ${period}`}
        </button>
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm leading-5 ${message.kind === "error" ? "text-red-800" : "text-emerald-900"}`}>
            {message.text}
          </p>
        )}
      </form>
      <div className="mt-4 border-t border-stone-300 pt-4">
        <button
          type="button"
          onClick={explainLatest}
          disabled={busy || analyzing || !explanationPeriod}
          className="min-h-11 w-full border border-emerald-900 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {analyzing ? "Generating explanation…" : explanationPeriod ? `Explain ${explanationPeriod} market data` : "No market data to explain"}
        </button>
        <div className="mt-3 space-y-2" aria-live="polite">
          {analysisError && <p role="alert" className="text-sm leading-5 text-red-800">{analysisError}</p>}
          {explanation && (
            <section className="border border-stone-300 bg-white p-4" aria-label="AI explanation">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Gemini-selected findings</p>
              <h3 className="mt-2 font-semibold text-stone-950">{explanation.headline}</h3>
              <p className="mt-2 text-sm leading-5 text-stone-700">{explanation.summary}</p>
              {explanation.observations.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-stone-700">
                  {explanation.observations.map((observation, index) => <li key={index}>{observation}</li>)}
                </ul>
              )}
              <p className="mt-3 border-t border-stone-200 pt-2 text-xs leading-5 text-stone-500">{explanation.caveat}</p>
            </section>
          )}
        </div>
      </div>
      <p className="mt-4 border-t border-stone-300 pt-3 text-xs leading-5 text-stone-500">
        Explanations send calculated trade evidence to Gemini. Enter the token only in your trusted workspace.
      </p>
    </aside>
  );
}
