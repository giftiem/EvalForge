import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AgentProfile } from "../models";
import { AgentRepository } from "../storage/agentRepository";
import { RunRepository } from "../storage/runRepository";
import { SetupPage } from "./SetupPage";

const agent: AgentProfile = {
  id: "agent_1", name: "BookBot", url: "https://example.com/chat", method: "POST",
  headers: { "Content-Type": "application/json" }, body_template: '{"q":"{{input}}"}',
  response_path: "reply", created_at: "2026-08-29T00:00:00.000Z",
};

describe("SetupPage", () => {
  it("generates, saves, and opens an initial run", async () => {
    new AgentRepository().save(agent);
    const onRunCreated = vi.fn();
    const client = { generate: vi.fn().mockResolvedValue({ tests: [{ input: "Hi", expected_behaviour: "Greet", category: "happy_path" }] }) };
    render(<SetupPage initialAgentId={agent.id} client={client} onManageAgents={vi.fn()} onRunCreated={onRunCreated} onRunOpen={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Requirements and expected behaviour"), { target: { value: "Always greet politely" } });
    fireEvent.change(screen.getByLabelText("Testing constraints"), { target: { value: " edge cases " } });
    fireEvent.click(screen.getByRole("button", { name: /Generate tests/ }));

    await waitFor(() => expect(onRunCreated).toHaveBeenCalledOnce());
    const created = onRunCreated.mock.calls[0]?.[0];
    expect(new RunRepository().get(created.id)).toEqual(created);
    expect(client.generate).toHaveBeenCalledWith(expect.objectContaining({ requirements: "Always greet politely", constraints: "edge cases", num_tests: 10 }));
  });

  it("shows generation errors inline and preserves input", async () => {
    new AgentRepository().save(agent);
    const client = { generate: vi.fn().mockRejectedValue(new Error("Generation service unavailable")) };
    render(<SetupPage client={client} onManageAgents={vi.fn()} onRunCreated={vi.fn()} onRunOpen={vi.fn()} />);
    const requirements = screen.getByLabelText("Requirements and expected behaviour");
    fireEvent.change(requirements, { target: { value: "Preserve this requirement" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate tests/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Generation service unavailable");
    expect(requirements).toHaveValue("Preserve this requirement");
  });

  it("directs users without agents to agent management", () => {
    render(<SetupPage onManageAgents={vi.fn()} onRunCreated={vi.fn()} onRunOpen={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Add an agent first" })).toBeVisible();
  });
});
