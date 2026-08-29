import { NetworkError } from "./errors";

export type ResponseGuard<T> = (value: unknown) => value is T;

interface PostJsonOptions<T> {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  guard: ResponseGuard<T>;
  operation: string;
}

export async function postJson<T>(
  url: string,
  body: unknown,
  { fetcher = fetch, timeoutMs = 30_000, guard, operation }: PostJsonOptions<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new NetworkError(`${operation} timed out. Try again.`, "timeout", undefined, { cause: error });
    throw new NetworkError(`${operation} could not reach the EvalForge service.`, "network", undefined, { cause: error });
  } finally {
    window.clearTimeout(timeout);
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
