export async function withMinimumLoading<T>(load: () => Promise<T>, minimumMs: number, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let timer: ReturnType<typeof setTimeout>;
  let cancel: () => void;
  const minimum = new Promise<void>(resolve => { timer = setTimeout(resolve, minimumMs); });
  const abort = new Promise<never>((_, reject) => {
    cancel = () => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
  });
  try {
    // Wait for the same minimum on success or failure without serializing the request.
    const [result] = await Promise.race([Promise.allSettled([load(), minimum]), abort]);
    if (result.status === "rejected") throw result.reason;
    return result.value;
  } finally {
    clearTimeout(timer!);
    signal.removeEventListener("abort", cancel!);
  }
}
