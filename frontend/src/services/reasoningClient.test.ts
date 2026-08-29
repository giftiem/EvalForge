import { describe, expect, it, vi } from "vitest";
import { SERVICE_ENDPOINTS } from "../constants/api";
import { ReasoningClient } from "./reasoningClient";

const context = { description: "Book support bot" };

describe("ReasoningClient", () => {
  it("calls generate with the fixed endpoint and JSON body", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      tests: [{ input: "Hello", expected_behaviour: "Greet the user", category: "happy_path" }],
    }), { status: 200 }));
    const request = { requirements: "Be helpful", agent_context: context, num_tests: 1 };

    const result = await new ReasoningClient(fetcher).generate(request);

    expect(result.tests).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(SERVICE_ENDPOINTS.generate, expect.objectContaining({
      method: "POST", body: JSON.stringify(request), headers: { "Content-Type": "application/json" },
    }));
  });

  it("validates each endpoint's response shape", async () => {
    const responses = [
      { passed: true, reasoning: "Correct" },
      { analyses: [{ test_id: "t1", explanation: "Invented facts", failure_type: "hallucination" }] },
      { tests: [{ input: "Again", expected_behaviour: "Be honest", category: "follow_up", spawned_from: "t1" }] },
    ];
    const fetcher = vi.fn<typeof fetch>();
    responses.forEach((payload) => fetcher.mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 })));
    const client = new ReasoningClient(fetcher);

    await expect(client.evaluate({ input: "Hi", expected_behaviour: "Greet", actual_response: "Hello", agent_context: context })).resolves.toEqual(responses[0]);
    await expect(client.analyze({ requirements: "Be honest", agent_context: context, failed_tests: [{ id: "t1", input: "?", expected_behaviour: "Say unknown", actual_response: "Invented" }] })).resolves.toEqual(responses[1]);
    await expect(client.recommend({ requirements: "Be honest", agent_context: context, analyses: responses[1]!.analyses as never })).resolves.toEqual(responses[2]);
  });

  it("throws a useful error for non-2xx responses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("failed", { status: 503 }));
    await expect(new ReasoningClient(fetcher).generate({ requirements: "Test", agent_context: {}, num_tests: 2 }))
      .rejects.toMatchObject({ code: "http", status: 503 });
  });

  it("rejects malformed JSON and unexpected payloads", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockResolvedValueOnce(new Response('{"tests":"wrong"}', { status: 200 }));
    const client = new ReasoningClient(fetcher);
    const request = { requirements: "Test", agent_context: {}, num_tests: 2 };
    await expect(client.generate(request)).rejects.toMatchObject({ code: "invalid_json" });
    await expect(client.generate(request)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("turns fetch failures into catchable network errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    await expect(new ReasoningClient(fetcher).generate({ requirements: "Test", agent_context: {}, num_tests: 1 }))
      .rejects.toMatchObject({ code: "network" });
  });
});
