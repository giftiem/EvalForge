import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { saveCodeArchive } from "./storage/codeArchive";
import { AgentRepository } from "./storage/agentRepository";

vi.mock("./storage/codeArchive", () => ({ saveCodeArchive: vi.fn().mockResolvedValue(undefined) }));

describe("agent management shell", () => {
  it("creates an agent from an imported ZIP and selects it for evaluation", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /New evaluation/ }));
    const file = new File(["code"], "my-agent.zip", { type: "application/zip" });
    fireEvent.change(screen.getByLabelText("Import code ZIP"), { target: { files: [file] } });
    expect(screen.getByRole("heading", { name: "Add an agent" })).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveValue("my-agent");
    expect(screen.getByRole("status")).toHaveTextContent("my-agent.zip");
    fireEvent.change(screen.getByLabelText("Endpoint URL"), { target: { value: "https://example.com/chat" } });
    fireEvent.click(screen.getByRole("button", { name: "Save agent" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Set up a test run" })).toBeVisible());
    const agent = new AgentRepository().list()[0]!;
    expect(agent.code_archive).toEqual({ name: "my-agent.zip", size: file.size });
    expect(saveCodeArchive).toHaveBeenCalledWith(agent.id, file);
    expect(screen.getByLabelText("Target agent")).toHaveValue(agent.id);
  });

  it("opens the add-agent form", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add your first agent" }));
    expect(screen.getByRole("heading", { name: "Add an agent" })).toBeVisible();
    expect(screen.getByText("Local storage notice")).toBeVisible();
  });

  it("shows validation errors instead of saving an incomplete agent", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add your first agent" }));
    fireEvent.click(screen.getByRole("button", { name: "Save agent" }));
    expect(screen.getByText("Enter a memorable agent name.")).toBeVisible();
    expect(screen.getByText("Enter a valid HTTP or HTTPS endpoint URL.")).toBeVisible();
  });

  it("saves an agent and uses it for a new run", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add your first agent" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "BookBot demo" } });
    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://example.com/chat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save agent" }));

    expect(screen.getByRole("heading", { name: "BookBot demo" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Use for new run" }));
    expect(screen.getByRole("heading", { name: "Set up a test run" })).toBeVisible();
    expect(screen.getByText("BookBot demo")).toBeVisible();
  });
});
