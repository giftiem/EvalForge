import { describe, expect, it, vi } from "vitest";
import type { RunRecord } from "../models";
import { RunRepository } from "../storage/runRepository";
import { RunOrchestrator } from "./runOrchestrator";

function initialRun(): RunRecord {
  return {
    schema_version: 1, id: "run_5000", agent_id: "agent_1",
    agent_snapshot: { name: "Bot", url: "https://target.test/chat", method: "POST", headers: {}, body_template: '{"q":"{{input}}"}', response_path: "reply", description: "Demo bot" },
    requirements: "Never invent facts", status: "running",
    iterations: [{ iteration_number: 1, pass_rate: 0, tests: [{ id: "t1", input: "Question 1", expected_behaviour: "Be honest", category: "edge_case", failure_analysis: null, spawned_from: null }] }],
    created_at: "2026-08-29T00:00:00.000Z", updated_at: "2026-08-29T00:00:00.000Z",
  };
}

describe("RunOrchestrator", () => {
  it("executes, evaluates, analyzes, and adapts through three iterations", async () => {
    const repository = new RunRepository();
    repository.save(initialRun());
    const target = { execute: vi.fn().mockResolvedValue({ actual_response: "Invented", latency_ms: 25, status_code: 200 }) };
    const reasoning = {
      evaluate: vi.fn().mockResolvedValue({ passed: false, reasoning: "Invented information" }),
      analyze: vi.fn().mockImplementation(({ failed_tests }) => Promise.resolve({ analyses: failed_tests.map((test: { id: string }) => ({ test_id: test.id, explanation: "Hallucinated", failure_type: "hallucination" })) })),
      recommend: vi.fn().mockImplementation(({ analyses }) => Promise.resolve({ tests: analyses.map((analysis: { test_id: string }) => ({ input: "Follow up", expected_behaviour: "Be honest", category: "edge_case", spawned_from: analysis.test_id })) })),
    };

    const result = await new RunOrchestrator(reasoning, target, repository).run("run_5000");

    expect(result.status).toBe("completed");
    expect(result.iterations).toHaveLength(3);
    expect(target.execute).toHaveBeenCalledTimes(3);
    expect(reasoning.evaluate).toHaveBeenCalledTimes(3);
    expect(reasoning.analyze).toHaveBeenCalledTimes(3);
    expect(reasoning.recommend).toHaveBeenCalledTimes(2);
    expect(result.iterations[1]?.tests[0]).toMatchObject({ id: "t2", spawned_from: "t1" });
    expect(repository.get(result.id)).toEqual(result);
  });

  it("resumes without repeating a completed target request", async () => {
    const repository = new RunRepository();
    const run = initialRun();
    run.iterations[0]!.tests[0]!.actual_response = "Existing response";
    run.iterations[0]!.tests[0]!.latency_ms = 12;
    repository.save(run);
    const target = { execute: vi.fn() };
    const reasoning = {
      evaluate: vi.fn().mockResolvedValue({ passed: true, reasoning: "Correct" }),
      analyze: vi.fn(), recommend: vi.fn(),
    };
    const result = await new RunOrchestrator(reasoning, target, repository).run(run.id);
    expect(result.status).toBe("completed");
    expect(target.execute).not.toHaveBeenCalled();
    expect(reasoning.evaluate).toHaveBeenCalledOnce();
  });

  it("persists step errors and can retry safely", async () => {
    const repository = new RunRepository();
    repository.save(initialRun());
    const target = { execute: vi.fn().mockRejectedValueOnce(new Error("Target offline")).mockResolvedValueOnce({ actual_response: "Good", latency_ms: 5, status_code: 200 }) };
    const reasoning = { evaluate: vi.fn().mockResolvedValue({ passed: true, reasoning: "Correct" }), analyze: vi.fn(), recommend: vi.fn() };
    const orchestrator = new RunOrchestrator(reasoning, target, repository);

    const failed = await orchestrator.run("run_5000");
    expect(failed).toMatchObject({ status: "failed", failed_step: "running", current_step_error: "Target offline" });
    const recovered = await orchestrator.run("run_5000");
    expect(recovered.status).toBe("completed");
    expect(recovered.current_step_error).toBeUndefined();
  });

  it("persists user cancellation without losing resumable state", async () => {
    const repository = new RunRepository();
    repository.save(initialRun());
    const controller = new AbortController();
    const target = { execute: vi.fn(async (_agent: RunRecord["agent_snapshot"], _input: string, signal?: AbortSignal) => {
      controller.abort();
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return { actual_response: "", latency_ms: 0, status_code: 200 };
    }) };
    const reasoning = { evaluate: vi.fn(), analyze: vi.fn(), recommend: vi.fn() };
    const result = await new RunOrchestrator(reasoning, target, repository).run("run_5000", { signal: controller.signal });
    expect(result).toMatchObject({ status: "failed", current_step_error: "Run cancelled by the user." });
    expect(result.iterations[0]?.tests[0]?.actual_response).toBeUndefined();
  });
});
