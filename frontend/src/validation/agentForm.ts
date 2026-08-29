import type { HttpMethod } from "../models";

export interface HeaderRow { id: string; key: string; value: string; }

export interface AgentFormValues {
  name: string;
  url: string;
  method: HttpMethod;
  headers: HeaderRow[];
  body_template: string;
  response_path: string;
  system_prompt: string;
  description: string;
}

export type AgentFormErrors = Partial<Record<keyof AgentFormValues | "form", string>>;

export function validateAgentForm(values: AgentFormValues): AgentFormErrors {
  const errors: AgentFormErrors = {};
  if (!values.name.trim()) errors.name = "Enter a memorable agent name.";

  try {
    const url = new URL(values.url);
    if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error();
  } catch {
    errors.url = "Enter a valid HTTP or HTTPS endpoint URL.";
  }

  const populatedHeaders = values.headers.filter((row) => row.key.trim() || row.value.trim());
  if (populatedHeaders.some((row) => !row.key.trim() || !row.value.trim())) {
    errors.headers = "Each header row needs both a name and value.";
  } else {
    const normalized = populatedHeaders.map((row) => row.key.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) errors.headers = "Header names must be unique.";
  }

  if (!values.body_template.trim()) {
    errors.body_template = "Enter the target's JSON request body template.";
  } else if (!values.body_template.includes("{{input}}")) {
    errors.body_template = "The template must contain the literal {{input}} placeholder.";
  } else {
    try { JSON.parse(values.body_template); }
    catch { errors.body_template = "The request body template must be valid JSON."; }
  }

  if (!values.response_path.trim()) errors.response_path = "Enter the dot-path to the reply text.";
  return errors;
}

export function headersToRecord(rows: HeaderRow[]): Record<string, string> {
  return Object.fromEntries(
    rows.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()]),
  );
}

