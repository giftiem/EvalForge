import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentSnapshot } from "../models";
import { buildRequestBody, findTextPaths, resolveResponsePath, TargetClient } from "./targetClient";

const agent: AgentSnapshot = {
  name: "BookBot", url: "https://target.example/chat", method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer private-key" },
  body_template: '{"messages":[{"role":"user","content":"{{input}}"}]}',
  response_path: "choices.0.message.content",
};

describe("target request helpers", () => {
  it("safely inserts quotes and newlines into a JSON template", () => {
    expect(buildRequestBody(agent.body_template, 'Say "hello"\nagain')).toEqual({
      messages: [{ role: "user", content: 'Say "hello"\nagain' }],
    });
  });

  it("resolves object and array response paths", () => {
    expect(resolveResponsePath({ choices: [{ message: { content: "Hello" } }] }, "choices.0.message.content")).toBe("Hello");
  });

  it("finds text response paths in nested payloads", () => {
    expect(findTextPaths({ json: { message: "Hello" }, choices: [{ text: "Alternative" }] })).toEqual([
      "json.message", "choices.0.text",
    ]);
  });
});

describe("TargetClient", () => {
  afterEach(() => vi.useRealTimers());

  it("calls the target directly and records latency", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { content: "Safe answer" } }] }), { status: 200 },
    ));
    const times = [100, 148];
    const result = await new TargetClient(fetcher, 5_000, () => times.shift() ?? 148).execute(agent, "Test input");

    expect(result).toEqual({ actual_response: "Safe answer", latency_ms: 48, status_code: 200 });
    expect(fetcher).toHaveBeenCalledWith(agent.url, expect.objectContaining({
      method: "POST", headers: agent.headers,
      body: JSON.stringify({ messages: [{ role: "user", content: "Test input" }] }),
    }));
  });

  it("maps top-level GET template values to query parameters", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"reply":"Hello"}', { status: 200 }));
    await new TargetClient(fetcher).execute({ ...agent, method: "GET", body_template: '{"q":"{{input}}"}', response_path: "reply" }, "hello world");
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://target.example/chat?q=hello+world");
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("reports missing response paths without exposing headers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"reply":"Hello"}', { status: 200 }));
    const promise = new TargetClient(fetcher).execute(agent, "test");
    await expect(promise).rejects.toMatchObject({ code: "response_path" });
    await expect(promise).rejects.not.toThrow("private-key");
  });

  it("returns the raw payload when no response path is supplied", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"reply":"Hello"}', { status: 200 }));
    const result = await new TargetClient(fetcher).execute({ ...agent, response_path: "" }, "test");
    expect(result.actual_response).toBe('{\n  "reply": "Hello"\n}');
    expect(result.response_paths).toEqual(["reply"]);
  });

  it("provides CORS guidance for browser fetch failures", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(new TargetClient(fetcher).execute(agent, "test"))
      .rejects.toThrow("CORS");
  });

  it("aborts target requests after the configured timeout", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const execution = new TargetClient(fetcher, 50).execute(agent, "test");
    const assertion = expect(execution).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });
});
