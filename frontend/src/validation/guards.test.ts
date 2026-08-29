import { describe, expect, it } from "vitest";
import { isAgentProfile, isGeneratedTest, isRunRecord, parseJsonSafely } from "./guards";

describe("runtime data guards", () => {
  it("accepts a valid agent profile", () => {
    expect(isAgentProfile({
      id: "agent_abc123", name: "BookBot", url: "https://example.com/chat", method: "POST",
      headers: { "Content-Type": "application/json" }, body_template: '{"message":"{{input}}"}',
      response_path: "reply", created_at: "2026-08-29T00:00:00.000Z",
    })).toBe(true);
  });

  it("rejects malformed agent headers", () => {
    expect(isAgentProfile({
      id: "agent_abc123", name: "BookBot", url: "https://example.com/chat", method: "POST",
      headers: { Authorization: 42 }, body_template: "{{input}}", response_path: "reply", created_at: "today",
    })).toBe(false);
  });

  it("validates generated test categories", () => {
    expect(isGeneratedTest({ input: "Hello", expected_behaviour: "Reply politely", category: "happy_path" })).toBe(true);
    expect(isGeneratedTest({ input: "Hello", expected_behaviour: "Reply", category: "invented" })).toBe(false);
  });

  it("rejects incomplete run records", () => {
    expect(isRunRecord({ schema_version: 1, id: "run_1" })).toBe(false);
  });

  it("returns undefined for malformed JSON", () => {
    expect(parseJsonSafely("{broken")).toBeUndefined();
  });
});
