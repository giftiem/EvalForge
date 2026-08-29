import { describe, expect, it } from "vitest";
import { headersToRecord, type AgentFormValues, validateAgentForm } from "./agentForm";

const valid: AgentFormValues = {
  name: "BookBot", url: "https://example.com/chat", method: "POST",
  headers: [{ id: "1", key: "Content-Type", value: "application/json" }],
  body_template: '{"message":"{{input}}"}', response_path: "reply",
  system_prompt: "", description: "",
};

describe("agent form validation", () => {
  it("accepts a complete agent", () => expect(validateAgentForm(valid)).toEqual({}));
  it("requires the input placeholder", () => {
    expect(validateAgentForm({ ...valid, body_template: '{"message":"hello"}' }).body_template).toMatch("{{input}}");
  });
  it("rejects malformed JSON", () => {
    expect(validateAgentForm({ ...valid, body_template: '{"message":"{{input}}"' }).body_template).toMatch("valid JSON");
  });
  it("rejects duplicate header names case-insensitively", () => {
    const headers = [...valid.headers, { id: "2", key: "content-type", value: "text/plain" }];
    expect(validateAgentForm({ ...valid, headers }).headers).toMatch("unique");
  });
  it("converts populated rows to a record", () => {
    expect(headersToRecord([...valid.headers, { id: "2", key: "", value: "" }])).toEqual({ "Content-Type": "application/json" });
  });
});
