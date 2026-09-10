import { NetworkError } from "./errors";

export type ResponseGuard<T> = (value: unknown) => value is T;

interface PostJsonOptions<T> {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  guard: ResponseGuard<T>;
  operation: string;
  signal?: AbortSignal;
}

export async function postJson<T>(
  url: string,
  body: unknown,
  { fetcher = globalThis.fetch.bind(globalThis), timeoutMs = 30_000, guard, operation, signal }: PostJsonOptions<T>,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw new NetworkError(`${operation} was cancelled.`, "cancelled", undefined, { cause: error });
    if (timedOut) throw new NetworkError(`${operation} timed out. Try again.`, "timeout", undefined, { cause: error });
    throw new NetworkError(`${operation} could not reach the EvalForge service.`, "network", undefined, { cause: error });
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new NetworkError(`${operation} failed with HTTP ${response.status}.`, "http", response.status);
  }

  let payload: unknown;
  try { payload = JSON.parse(text) as unknown; }
  catch (error) { throw new NetworkError(`${operation} returned malformed JSON.`, "invalid_json", response.status, { cause: error }); }
  if (!guard(payload)) throw new NetworkError(`${operation} returned an unexpected response shape.`, "invalid_response", response.status);
  return payload;
}
