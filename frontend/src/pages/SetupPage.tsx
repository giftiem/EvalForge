import { useMemo, useState, type FormEvent } from "react";
import type { RunRecord } from "../models";
import { createInitialRun, type GenerateClient } from "../orchestration/createInitialRun";
import { ReasoningClient } from "../services/reasoningClient";
import { AgentRepository } from "../storage/agentRepository";
import { RunRepository } from "../storage/runRepository";

interface SetupPageProps {
  initialAgentId?: string;
  client?: GenerateClient;
  onManageAgents: () => void;
  onRunCreated: (run: RunRecord) => void;
  onRunOpen: (run: RunRecord) => void;
}

export function SetupPage({ initialAgentId, client, onManageAgents, onRunCreated, onRunOpen }: SetupPageProps) {
  const agents = useMemo(() => new AgentRepository().list(), []);
  const runRepository = useMemo(() => new RunRepository(), []);
  const generationClient = useMemo(() => client ?? new ReasoningClient(), [client]);
  const [pastRuns, setPastRuns] = useState(() => runRepository.list());
  const [agentId, setAgentId] = useState(() => initialAgentId && agents.some((agent) => agent.id === initialAgentId) ? initialAgentId : agents[0]?.id ?? "");
  const [requirements, setRequirements] = useState("");
  const [constraints, setConstraints] = useState("");
  const [error, setError] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) { setError("Choose a saved agent before generating tests."); return; }
    if (!requirements.trim()) { setError("Describe the expected agent behaviour before generating tests."); return; }

    setIsGenerating(true);
    try {
      const run = await createInitialRun({ agent, requirements, constraints }, generationClient, runRepository);
      setPastRuns(runRepository.list());
      onRunCreated(run);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Test generation failed. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="page-content setup-page">
      <header className="page-heading"><div><p className="eyebrow">New evaluation</p><h1>Set up a test run</h1><p>Choose a target and define what correct behaviour looks like.</p></div></header>

      {agents.length === 0 ? (
        <section className="empty-state compact"><span className="empty-icon">◎</span><h2>Add an agent first</h2><p>A saved endpoint is required before EvalForge can generate tests.</p><button className="primary-button" onClick={onManageAgents}>Manage agents</button></section>
      ) : (
        <form className="setup-form" onSubmit={submit}>
          <div className="setup-form-heading"><div><span>01</span><div><h2>Run details</h2><p>The selected profile will be snapshotted so future edits cannot change this run.</p></div></div><span className="test-count">10 initial tests</span></div>
          {error && <div className="inline-error" role="alert"><strong>Generation stopped</strong><span>{error}</span></div>}
          <label className="field wide"><span>Target agent</span><select aria-label="Target agent" value={agentId} onChange={(event) => setAgentId(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} — {agent.url}</option>)}</select></label>
          <label className="field wide"><span>Requirements and expected behaviour</span><small>Be specific—these requirements become the evaluator's yardstick.</small><textarea aria-label="Requirements and expected behaviour" rows={8} value={requirements} onChange={(event) => setRequirements(event.target.value)} placeholder="The agent answers order and return questions, stays consistent, and never gives legal or medical advice." /></label>
          <label className="field wide"><span>Testing constraints</span><small>Optional focus for test generation.</small><input aria-label="Testing constraints" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Focus on consistency and security" /></label>
          <div className="selected-agent-preview">{(() => { const selected = agents.find((agent) => agent.id === agentId); return selected ? <><div className="agent-avatar">{selected.name.slice(0, 2).toUpperCase()}</div><div><strong>{selected.name}</strong><span>{selected.method} · {selected.response_path}</span></div><button type="button" className="text-button" onClick={onManageAgents}>Edit agents</button></> : null; })()}</div>
          <div className="form-actions"><button className="primary-button generate-button" disabled={isGenerating}>{isGenerating ? <><span className="spinner" />Generating test suite…</> : <>Generate tests <span>→</span></>}</button></div>
        </form>
      )}

      <section className="past-runs">
        <div className="section-heading"><div><h2>Past runs</h2><p>Reopen evaluations stored in this browser.</p></div><span>{pastRuns.length} total</span></div>
        {pastRuns.length === 0 ? <p className="empty-row">No previous runs yet.</p> : pastRuns.map((run) => <button className="past-run-row" key={run.id} onClick={() => onRunOpen(run)}><div><strong>{run.agent_snapshot.name}</strong><span>{run.requirements}</span></div><div><span className={`run-status ${run.status}`}>{run.status}</span><time>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.created_at))}</time><b>→</b></div></button>)}
      </section>
    </section>
  );
}
