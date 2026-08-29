import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("application shell", () => {
  it("renders the EvalForge foundation", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "AI agent testing workspace" })).toBeVisible();
    expect(screen.getByText("Browser localStorage")).toBeVisible();
  });
});
