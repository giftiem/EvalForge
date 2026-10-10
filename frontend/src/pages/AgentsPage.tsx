import { useState } from "react";
import { AgentForm } from "../components/AgentForm";
import { AgentList } from "../components/AgentList";
import { useAgents } from "../hooks/useAgents";
import type { AgentProfile } from "../models";

interface AgentsPageProps {
  onUseAgent: (agent: AgentProfile) => void;
  initiallyOpen?: boolean;
  initialArchive?: File;
  onArchiveHandled?: () => void;
}

export function AgentsPage({ onUseAgent, initiallyOpen = false, initialArchive, onArchiveHandled }: AgentsPageProps) {
  const { agents, deleteAgent, saveAgent, storageError } = useAgents();
  const [formOpen, setFormOpen] = useState(initiallyOpen);
  const [editingAgent, setEditingAgent] = useState<AgentProfile>();
  const [archive, setArchive] = useState(initialArchive);

  function clearArchive() { setArchive(undefined); onArchiveHandled?.(); }
  function openCreate() { clearArchive(); setEditingAgent(undefined); setFormOpen(true); }
  function openEdit(agent: AgentProfile) { clearArchive(); setEditingAgent(agent); setFormOpen(true); }
  function closeForm() { clearArchive(); setFormOpen(false); setEditingAgent(undefined); }

  return (
    <section className="page-content">
      <header className="page-heading">
        <div><p className="eyebrow">Saved targets</p><h1>Agents</h1><p>Manage the AI endpoints you want to test.</p></div>
        {!formOpen && <button className="primary-button" onClick={openCreate}>＋ Add agent</button>}
      </header>
      {storageError && <div className="inline-error" role="alert">{storageError}</div>}
      {formOpen ? (
        <AgentForm agent={editingAgent} initialArchive={archive} onCancel={closeForm} onSave={(agent) => {
          saveAgent(agent);
          const returnToEvaluation = Boolean(archive);
          closeForm();
          if (returnToEvaluation) onUseAgent(agent);
        }} />
      ) : (
        <AgentList agents={agents} onAdd={openCreate} onDelete={deleteAgent} onEdit={openEdit} onUse={onUseAgent} />
      )}
    </section>
  );
}
