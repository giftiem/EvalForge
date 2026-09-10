import { useState, type FormEvent } from "react";
import type { AgentProfile, AgentSnapshot } from "../models";
import {
  headersToRecord, type AgentFormErrors, type AgentFormValues, type HeaderRow, validateAgentForm,
} from "../validation/agentForm";
import { TargetClient } from "../services/targetClient";

interface AgentFormProps {
  agent?: AgentProfile;
  onCancel: () => void;
  onSave: (agent: AgentProfile) => void;
}

const DEFAULT_TEMPLATE = '{\n  "messages": [\n    { "role": "user", "content": "{{input}}" }\n  ]\n}';
const newHeader = (key = "", value = ""): HeaderRow => ({ id: crypto.randomUUID(), key, value });

function valuesFromAgent(agent?: AgentProfile): AgentFormValues {
  return {
    name: agent?.name ?? "",
    url: agent?.url ?? "",
    method: agent?.method ?? "POST",
    headers: agent ? Object.entries(agent.headers).map(([key, value]) => newHeader(key, value)) : [newHeader("Content-Type", "application/json")],
    body_template: agent?.body_template ?? DEFAULT_TEMPLATE,
    response_path: agent?.response_path ?? "reply",
    system_prompt: agent?.system_prompt ?? "",
    description: agent?.description ?? "",
  };
}

export function AgentForm({ agent, onCancel, onSave }: AgentFormProps) {
  const [values, setValues] = useState(() => valuesFromAgent(agent));
  const [errors, setErrors] = useState<AgentFormErrors>({});
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    response?: string;
    responsePaths?: string[];
  } | undefined>();
  const [isTesting, setIsTesting] = useState(false);

  function update<K extends keyof AgentFormValues>(field: K, value: AgentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateHeader(id: string, field: "key" | "value", value: string) {
    update("headers", values.headers.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateAgentForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const optional = {
      ...(values.system_prompt.trim() && { system_prompt: values.system_prompt.trim() }),
      ...(values.description.trim() && { description: values.description.trim() }),
    };
    onSave({
      id: agent?.id ?? `agent_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
      created_at: agent?.created_at ?? new Date().toISOString(),
      name: values.name.trim(), url: values.url.trim(), method: values.method,
      headers: headersToRecord(values.headers), body_template: values.body_template.trim(),
      response_path: values.response_path.trim(), ...optional,
    });
  }

  async function handleTest(event: FormEvent) {
    event.preventDefault();
    setTestResult(undefined);
    const nextErrors = validateAgentForm(values, { requireResponsePath: false });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsTesting(true);
    try {
      const snapshot: AgentSnapshot = {
        name: values.name.trim(),
        url: values.url.trim(),
        method: values.method,
        headers: headersToRecord(values.headers),
        body_template: values.body_template.trim(),
        response_path: values.response_path.trim(),
        ...(values.system_prompt.trim() && { system_prompt: values.system_prompt.trim() }),
        ...(values.description.trim() && { description: values.description.trim() }),
      };

      console.log("🧪 [AgentTest] Starting test with config:", snapshot);

      const testInput = "test";
      console.log("🧪 [AgentTest] Test input:", testInput);

      const client = new TargetClient();
      const result = await client.execute(snapshot, testInput);

      console.log("✅ [AgentTest] Success! Full result:", result);

      setTestResult({
        success: true,
        message: result.response_paths?.length
          ? `Success! Response received. Choose a response path below.`
          : `Success! Response: ${result.actual_response.slice(0, 100)}${result.actual_response.length > 100 ? "..." : ""}`,
        response: result.actual_response,
        responsePaths: result.response_paths,
      });
    } catch (error) {
      console.error("❌ [AgentTest] Error occurred:", error);
      console.error("❌ [AgentTest] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error && error.cause ? error.cause : null,
        stack: error instanceof Error ? error.stack : null,
        fullError: error,
      });

      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Test failed. Check your configuration.",
      });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <form className="agent-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <div><p className="eyebrow">Agent profile</p><h2>{agent ? "Edit agent" : "Add an agent"}</h2><p>Save the connection details once and reuse them across test runs.</p></div>
        <button type="button" className="close-button" aria-label="Close form" onClick={onCancel}>×</button>
      </div>

      <div className="form-grid">
        <Field label="Name" error={errors.name}><input value={values.name} onChange={(e) => update("name", e.target.value)} placeholder="BookBot demo" /></Field>
        <Field label="HTTP method"><select value={values.method} onChange={(e) => update("method", e.target.value as "GET" | "POST")}><option>POST</option><option>GET</option></select></Field>
        <Field label="Endpoint URL" error={errors.url} wide><input value={values.url} onChange={(e) => update("url", e.target.value)} placeholder="https://example.com/api/chat" type="url" /></Field>
      </div>

      <fieldset className="headers-fieldset">
        <legend>Request headers</legend>
        <p>Add authentication or content headers required by the target.</p>
        {values.headers.map((header) => (
          <div className="header-row" key={header.id}>
            <input aria-label="Header name" value={header.key} onChange={(e) => updateHeader(header.id, "key", e.target.value)} placeholder="Header name" />
            <input aria-label="Header value" value={header.value} onChange={(e) => updateHeader(header.id, "value", e.target.value)} placeholder="Header value" />
            <button type="button" aria-label="Remove header" onClick={() => update("headers", values.headers.filter((row) => row.id !== header.id))}>×</button>
          </div>
        ))}
        {errors.headers && <span className="field-error">{errors.headers}</span>}
        <button type="button" className="text-button" onClick={() => update("headers", [...values.headers, newHeader()])}>＋ Add header</button>
        <aside className="security-note"><strong>Local storage notice</strong><span>Header values, including API keys, are stored unencrypted in this browser. Use restricted demo credentials.</span></aside>
      </fieldset>

      <Field label="Request body template" hint="Use the literal {{input}} where each generated prompt belongs." error={errors.body_template} wide>
        <textarea rows={7} value={values.body_template} onChange={(e) => update("body_template", e.target.value)} spellCheck={false} />
      </Field>
      <Field label="Response path" hint="Optional for testing. Leave blank to inspect the response and find the right dot-path." error={errors.response_path} wide>
        <input value={values.response_path} onChange={(e) => update("response_path", e.target.value)} placeholder="reply" />
      </Field>
      <Field label="System prompt" hint="Optional, but improves evaluation and analysis quality." wide>
        <textarea rows={5} value={values.system_prompt} onChange={(e) => update("system_prompt", e.target.value)} placeholder="Paste the target agent's system prompt…" />
      </Field>
      <Field label="Description" hint="Optional context about what this agent does." wide>
        <textarea rows={3} value={values.description} onChange={(e) => update("description", e.target.value)} placeholder="Customer support agent for an online bookstore." />
      </Field>

      {testResult && (
        <div className={`test-result ${testResult.success ? "success" : "error"}`} role="alert">
          <span>{testResult.message}</span>
          {testResult.responsePaths?.length ? (
            <div className="response-paths">
              <strong>Text response paths</strong>
              {testResult.responsePaths.map((path) => (
                <button type="button" className="path-button" key={path} onClick={() => update("response_path", path)}>{path}</button>
              ))}
            </div>
          ) : null}
          {testResult.response ? <pre className="response-preview">{testResult.response}</pre> : null}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
        <button type="button" className="text-button" disabled={isTesting} onClick={handleTest}>
          {isTesting ? "Testing..." : "Test agent"}
        </button>
        <button className="primary-button" type="submit">{agent ? "Save changes" : "Save agent"}</button>
      </div>
    </form>
  );
}

interface FieldProps { label: string; hint?: string; error?: string; wide?: boolean; children: React.ReactNode; }
function Field({ label, hint, error, wide, children }: FieldProps) {
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span>{hint && <small>{hint}</small>}{children}{error && <em className="field-error">{error}</em>}</label>;
}
