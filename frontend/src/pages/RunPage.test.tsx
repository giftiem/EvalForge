import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RunRecord } from "../models";
import { RunRepository } from "../storage/runRepository";
import { RunPage } from "./RunPage";

function fixture(): RunRecord {
  return {
    schema_version: 1, id: "run_9000", agent_id: "agent_1", status: "paused", requirements: "Be helpful",
    agent_snapshot: { name: "Bot", url: "https://example.com/chat", method: "POST", headers: {}, body_template: '{"q":"{{input}}"}', response_path: "reply" },
    iterations: [{ iteration_number: 1, pass_rate: 0, tests: [{ id: "t1", input: "Original", expected_behaviour: "Greet", category: "happy_path", failure_analysis: null, spawned_from: null, actual_response: "Stale response", latency_ms: 20 }] }],
    created_at: "2026-10-10T00:00:00.000Z", updated_at: "2026-10-10T00:00:00.000Z",
  };
}

describe("RunPage review", () => {
  it("waits for approval, saves edits, and clears cached responses when the input changes", async () => {
    const run = fixture();
    const repository = new RunRepository();
    repository.save(run);
    const engine = { run: vi.fn(async () => ({ ...repository.get(run.id)!, status: "completed" as const })) };
    render(<RunPage initialRun={run} engine={engine} onBack={vi.fn()} onComplete={vi.fn()} onViewResults={vi.fn()} />);
    expect(engine.run).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Input t1"), { target: { value: "Edited input" } });
    fireEvent.change(screen.getByLabelText("Expected behaviour t1"), { target: { value: "Edited expectation" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve tests and evaluate" }));
    await waitFor(() => expect(engine.run).toHaveBeenCalledOnce());
    const saved = repository.get(run.id)!;
    expect(saved.iterations[0]!.tests_reviewed).toBe(true);
    expect(saved.iterations[0]!.tests[0]).toMatchObject({ input: "Edited input", expected_behaviour: "Edited expectation" });
    expect(saved.iterations[0]!.tests[0]!.actual_response).toBeUndefined();
    expect(saved.iterations[0]!.tests[0]!.latency_ms).toBeUndefined();
  });

  it("rejects blank edits without starting evaluation", () => {
    const run = fixture();
    new RunRepository().save(run);
    const engine = { run: vi.fn() };
    render(<RunPage initialRun={run} engine={engine} onBack={vi.fn()} onComplete={vi.fn()} onViewResults={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Expected behaviour t1"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Approve tests and evaluate" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Every test needs");
    expect(engine.run).not.toHaveBeenCalled();
  });
});
