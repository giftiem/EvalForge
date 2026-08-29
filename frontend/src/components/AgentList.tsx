import type { AgentProfile } from "../models";

interface AgentListProps {
  agents: AgentProfile[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (agent: AgentProfile) => void;
  onUse: (agent: AgentProfile) => void;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function AgentList({ agents, onAdd, onDelete, onEdit, onUse }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <section className="empty-state">
        <span className="empty-icon" aria-hidden="true">◎</span>
        <h2>No agents saved yet</h2>
        <p>Add the first target endpoint you want EvalForge to test.</p>
        <button className="primary-button" onClick={onAdd}>Add your first agent</button>
      </section>
    );
  }

  return (
    <div className="agent-list">
      {agents.map((agent) => (
        <article className="agent-card" key={agent.id}>
          <div className="agent-avatar" aria-hidden="true">{agent.name.slice(0, 2).toUpperCase()}</div>
          <div className="agent-details">
            <div className="agent-title-row">
              <h2>{agent.name}</h2><span className="method-badge">{agent.method}</span>
            </div>
            <p className="endpoint">{agent.url}</p>
            <p className="agent-meta">Created {formatCreatedAt(agent.created_at)} · Response: {agent.response_path}</p>
          </div>
          <div className="agent-actions">
            <button className="primary-button" onClick={() => onUse(agent)}>Use for new run</button>
            <button className="secondary-button" onClick={() => onEdit(agent)}>Edit</button>
            <button
              className="danger-button"
              onClick={() => {
                if (window.confirm(`Delete ${agent.name}? Existing run snapshots will not be affected.`)) onDelete(agent.id);
              }}
            >Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}

