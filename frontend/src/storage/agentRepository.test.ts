import { beforeEach, describe, expect, it } from "vitest";
import type { AgentProfile } from "../models";
import { AgentRepository } from "./agentRepository";

const agent: AgentProfile = {
  id: "agent_abc123",
  name: "BookBot demo",
  url: "https://example.com/chat",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body_template: '{"messages":[{"role":"user","content":"{{input}}"}]}',
  response_path: "choices.0.message.content",
  created_at: "2026-08-29T10:00:00.000Z",
};

describe("AgentRepository", () => {
  beforeEach(() => localStorage.clear());

  it("creates and reloads an agent", () => {
    const repository = new AgentRepository();
    repository.save(agent);
    expect(new AgentRepository().get(agent.id)).toEqual(agent);
  });

  it("updates an existing agent without duplicating it", () => {
    const repository = new AgentRepository();
    repository.save(agent);
    repository.save({ ...agent, name: "Updated BookBot" });
    expect(repository.list()).toHaveLength(1);
    expect(repository.get(agent.id)?.name).toBe("Updated BookBot");
  });

  it("deletes an existing agent", () => {
    const repository = new AgentRepository();
    repository.save(agent);
    expect(repository.delete(agent.id)).toBe(true);
    expect(repository.list()).toEqual([]);
  });

  it("ignores malformed stored records", () => {
    localStorage.setItem("evalforge_agents", JSON.stringify([agent, { id: 12 }, agent]));
    expect(new AgentRepository().list()).toEqual([agent]);
  });

  it("recovers safely from malformed JSON", () => {
    localStorage.setItem("evalforge_agents", "{broken");
    expect(new AgentRepository().list()).toEqual([]);
  });
});

