/** Retry reads once after transient failures. Writes are never replayed automatically. */
export async function databaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const callerSignal = init?.signal ?? request?.signal;
  const attempts = method === "GET" || method === "HEAD" ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    callerSignal?.throwIfAborted();
    const timeout = AbortSignal.timeout(10000);
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;
    try {
      const response = await fetch(input, { ...init, signal, cache: "no-store" });
      if (attempt + 1 === attempts || ![502, 503, 504].includes(response.status)) return response;
      await response.body?.cancel();
    } catch (error) {
      if (callerSignal?.aborted || attempt + 1 === attempts) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Database request failed");
}
