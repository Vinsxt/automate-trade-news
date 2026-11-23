"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const YEARS = ["2025", "2024", "2023", "2022", "2021"];

export function ImportControls() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [period, setPeriod] = useState("2025");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
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
          disabled={busy}
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
      <p className="mt-4 border-t border-stone-300 pt-3 text-xs leading-5 text-stone-500">
        The token is sent only in the request authorization header and cleared after success. Do not paste it into a shared or deployed site.
      </p>
    </aside>
  );
}
