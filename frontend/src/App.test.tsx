import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("agent management shell", () => {
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
    expect(screen.getByRole("heading", { name: "Run setup" })).toBeVisible();
    expect(screen.getByText("BookBot demo")).toBeVisible();
  });
});
