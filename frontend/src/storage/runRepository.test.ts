import { describe, expect, it } from "vitest";
import type { RunRecord } from "../models";
import { RunRepository } from "./runRepository";

const run: RunRecord = {
  schema_version: 1, id: "run_1000", agent_id: "agent_1",
  agent_snapshot: { name: "BookBot", url: "https://example.com/chat", method: "POST", headers: {}, body_template: '{"q":"{{input}}"}', response_path: "reply" },
  requirements: "Be helpful", status: "running",
  iterations: [{ iteration_number: 1, pass_rate: 0, tests: [{ id: "t1", input: "Hi", expected_behaviour: "Greet", category: "happy_path", failure_analysis: null, spawned_from: null }] }],
  created_at: "2026-08-29T10:00:00.000Z", updated_at: "2026-08-29T10:00:00.000Z",
};

describe("RunRepository", () => {
  it("stores runs under the required timestamp key", () => {
    new RunRepository().save(run);
    expect(JSON.parse(localStorage.getItem("evalforge_run_1000") ?? "null")).toEqual(run);
  });

  it("loads valid runs and ignores malformed entries", () => {
    localStorage.setItem("evalforge_run_bad", "{broken");
    localStorage.setItem("other_key", JSON.stringify(run));
    new RunRepository().save(run);
    expect(new RunRepository().list()).toEqual([run]);
  });

  it("avoids timestamp collisions when creating IDs", () => {
    new RunRepository().save(run);
    expect(new RunRepository().createId(1000)).toBe("run_1001");
  });
});

