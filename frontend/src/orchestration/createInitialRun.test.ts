import { describe, expect, it, vi } from "vitest";
import type { AgentProfile } from "../models";
import { RunRepository } from "../storage/runRepository";
import { createInitialRun } from "./createInitialRun";

const agent: AgentProfile = {
  id: "agent_1", name: "BookBot", url: "https://example.com/chat", method: "POST", headers: {},
  body_template: '{"q":"{{input}}"}', response_path: "reply", system_prompt: "Be helpful",
  description: "Book support", created_at: "2026-08-29T00:00:00.000Z",
};

describe("createInitialRun", () => {
  it("generates tests, snapshots the agent, and saves the run", async () => {
    const client = { generate: vi.fn().mockResolvedValue({ tests: [{ input: "Hi", expected_behaviour: "Greet", category: "happy_path" }] }) };
    const repository = new RunRepository();
    const run = await createInitialRun({ agent, requirements: " Be helpful ", constraints: " edge cases ", numTests: 1 }, client, repository);

    expect(client.generate).toHaveBeenCalledWith({ requirements: "Be helpful", constraints: "edge cases", agent_context: { system_prompt: "Be helpful", description: "Book support" }, num_tests: 1 });
    expect(run.agent_snapshot).not.toHaveProperty("id");
    expect(run.iterations[0]?.tests[0]).toMatchObject({ id: "t1", failure_analysis: null, spawned_from: null });
    expect(repository.get(run.id)).toEqual(run);
  });

  it("rejects an empty generated suite", async () => {
    const client = { generate: vi.fn().mockResolvedValue({ tests: [] }) };
    await expect(createInitialRun({ agent, requirements: "Test" }, client)).rejects.toThrow("empty suite");
  });
});
