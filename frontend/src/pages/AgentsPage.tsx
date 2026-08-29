import { useState } from "react";
import { AgentForm } from "../components/AgentForm";
import { AgentList } from "../components/AgentList";
import { useAgents } from "../hooks/useAgents";
import type { AgentProfile } from "../models";

interface AgentsPageProps { onUseAgent: (agent: AgentProfile) => void; }

export function AgentsPage({ onUseAgent }: AgentsPageProps) {
  const { agents, deleteAgent, saveAgent, storageError } = useAgents();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentProfile>();

  function openCreate() { setEditingAgent(undefined); setFormOpen(true); }
  function openEdit(agent: AgentProfile) { setEditingAgent(agent); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditingAgent(undefined); }

  return (
    <section className="page-content">
      <header className="page-heading">
        <div><p className="eyebrow">Saved targets</p><h1>Agents</h1><p>Manage the AI endpoints you want to test.</p></div>
        {!formOpen && <button className="primary-button" onClick={openCreate}>＋ Add agent</button>}
      </header>
      {storageError && <div className="inline-error" role="alert">{storageError}</div>}
      {formOpen ? (
        <AgentForm agent={editingAgent} onCancel={closeForm} onSave={(agent) => { saveAgent(agent); closeForm(); }} />
      ) : (
        <AgentList agents={agents} onAdd={openCreate} onDelete={deleteAgent} onEdit={openEdit} onUse={onUseAgent} />
      )}
    </section>
  );
}
