import type { AgentSnapshot, TargetExecutionResult } from "../models";
import { parseJsonSafely } from "../validation/guards";
import { NetworkError } from "./errors";

type JsonObject = Record<string, unknown>;

export class TargetClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 30_000,
    private readonly now: () => number = () => performance.now(),
  ) {}

  async execute(agent: AgentSnapshot, input: string): Promise<TargetExecutionResult> {
    const requestBody = buildRequestBody(agent.body_template, input);
    const url = agent.method === "GET" ? buildGetUrl(agent.url, requestBody) : agent.url;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = this.now();
    let response: Response;

    try {
      response = await this.fetcher(url, {
        method: agent.method,
        headers: agent.headers,
        ...(agent.method === "POST" && { body: JSON.stringify(requestBody) }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new NetworkError(`The target agent timed out after ${this.timeoutMs} ms.`, "timeout", undefined, { cause: error });
      }
      throw new NetworkError(
        "The target agent could not be reached. Check its URL, availability, and browser CORS policy.",
        "network",
        undefined,
        { cause: error },
      );
    } finally {
      window.clearTimeout(timeout);
    }

    const latencyMs = Math.max(0, Math.round(this.now() - startedAt));
    const text = await response.text();
    if (!response.ok) throw new NetworkError(`The target agent returned HTTP ${response.status}.`, "http", response.status);

    const payload = parseJsonSafely(text);
    if (payload === undefined) throw new NetworkError("The target agent returned malformed JSON.", "invalid_json", response.status);
    const actualResponse = resolveResponsePath(payload, agent.response_path);
    if (typeof actualResponse !== "string") {
      throw new NetworkError(`The response path “${agent.response_path}” did not resolve to text.`, "response_path", response.status);
    }

    return { actual_response: actualResponse, latency_ms: latencyMs, status_code: response.status };
  }
}

export function buildRequestBody(template: string, input: string): unknown {
  const escapedInput = JSON.stringify(input).slice(1, -1);
  const substituted = template.split("{{input}}").join(escapedInput);
  const parsed = parseJsonSafely(substituted);
  if (parsed === undefined) {
    throw new NetworkError("The request body template became invalid JSON after inserting the test input.", "invalid_template");
  }
  return parsed;
}

export function resolveResponsePath(payload: unknown, path: string): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }
    if (typeof current === "object" && current !== null) return (current as JsonObject)[segment];
    return undefined;
  }, payload);
}

function buildGetUrl(baseUrl: string, body: unknown): string {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new NetworkError("GET request templates must contain a top-level JSON object.", "invalid_template");
  }
  const url = new URL(baseUrl);
  Object.entries(body as JsonObject).forEach(([key, value]) => {
    url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
  });
  return url.toString();
}

