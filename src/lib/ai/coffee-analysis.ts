import { setTimeout } from "node:timers/promises";
import { fallbackCoffeeOutlook, traceCoffeeOutlook, type coffeeOutlookEvidence } from "../trade/coffee-outlook";

type Evidence = ReturnType<typeof coffeeOutlookEvidence>;

export type CoffeeAnalysisInput = { evidence: Evidence; snapshot: string; allowGenerate: boolean };
export type CoffeeAnalysisResponse = { ids: string[]; sections: string[] };
type SavedAnalysis = { response: CoffeeAnalysisResponse; generatedAt: string; coverage: string };
type Reservation = { state: "reserved"; attemptId: string } | { state: "running" | "ready" | "unavailable" };
type AttemptStatus = "passed" | "invalid" | "provider_error";

export type CoffeeAnalysisView = {
  state: "current" | "outdated" | "data";
  sections: string[];
  generatedAt: string | null;
  coverage: string;
};

export interface CoffeeAnalysisStore {
  find(key: string): Promise<SavedAnalysis | null>;
  previous(end: number, key: string): Promise<SavedAnalysis | null>;
  reserve(input: CoffeeAnalysisInput): Promise<Reservation>;
  save(key: string, input: CoffeeAnalysisInput, response: CoffeeAnalysisResponse): Promise<SavedAnalysis>;
  finish(attemptId: string, status: AttemptStatus): Promise<void>;
}

export async function resolveCoffeeAnalysis(
  input: CoffeeAnalysisInput,
  store: CoffeeAnalysisStore,
  generate: (evidence: Evidence) => Promise<string[]>,
  wait = () => setTimeout(850),
  log: (event: string, durationMs?: number) => void = () => {},
): Promise<CoffeeAnalysisView> {
  const { evidence, allowGenerate } = input;
  const { key, period, end } = evidence;
  const current = (saved: SavedAnalysis): CoffeeAnalysisView => ({
    state: "current", sections: traceCoffeeOutlook(evidence, saved.response.ids),
    generatedAt: saved.generatedAt, coverage: saved.coverage,
  });
  const fallback = async (): Promise<CoffeeAnalysisView> => {
    const prior = await store.previous(end, key).catch(() => null);
    return prior ? {
      state: "outdated", sections: prior.response.sections, generatedAt: prior.generatedAt, coverage: prior.coverage,
    } : { state: "data", sections: fallbackCoffeeOutlook(evidence), coverage: period, generatedAt: null };
  };

  try {
    const cached = await store.find(key);
    if (cached) {
      log("cache_hit");
      return current(cached);
    }
    log("cache_miss");
    if (!allowGenerate) return fallback();

    const reservation = await store.reserve(input);
    if (reservation.state === "ready") {
      const saved = await store.find(key);
      return saved ? current(saved) : fallback();
    }
    if (reservation.state === "running") {
      const deadline = Date.now() + 36_000;
      do {
        await wait();
        const saved = await store.find(key);
        if (saved) return current(saved);
        // Stop waiting promptly when the other attempt finishes without a result.
        const next = await store.reserve({ ...input, allowGenerate: false });
        if (next.state !== "running") {
          const completed = next.state === "ready" ? await store.find(key) : null;
          return completed ? current(completed) : fallback();
        }
      } while (Date.now() < deadline);
      return fallback();
    }
    if (reservation.state !== "reserved") return fallback();

    const startedAt = Date.now();
    let status: AttemptStatus = "provider_error";
    try {
      const ids = await generate(evidence);
      status = "invalid";
      const sections = traceCoffeeOutlook(evidence, ids);
      status = "provider_error";
      const saved = await store.save(key, input, { ids, sections });
      status = "passed";
      return current(saved);
    } catch {
      return fallback();
    } finally {
      log(status === "passed" ? "generated" : "generation_failed", Date.now() - startedAt);
      await store.finish(reservation.attemptId, status).catch(() => log("attempt_update_failed"));
    }
  } catch {
    log("analysis_unavailable");
    return fallback();
  }
}
