import { useState } from "react";
import type { AgentProfile } from "./models";
import { AgentsPage } from "./pages/AgentsPage";
import "./styles/global.css";

type View = "agents" | "setup";

export default function App() {
  const [view, setView] = useState<View>("agents");
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile>();

  function useAgent(agent: AgentProfile) {
    setSelectedAgent(agent);
    setView("setup");
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("agents")}><span>E</span>EvalForge</button>
        <nav aria-label="Main navigation">
          <button className={view === "agents" ? "active" : ""} onClick={() => setView("agents")}><span>◎</span>Agents</button>
          <button className={view === "setup" ? "active" : ""} onClick={() => setView("setup")}><span>＋</span>New run</button>
          <button disabled><span>◫</span>Runs</button>
          <button disabled><span>▥</span>Results</button>
        </nav>
        <div className="sidebar-foot"><span className="status-dot" />Reasoning service configured</div>
      </aside>
      <main className="main-area">
        {view === "agents" ? <AgentsPage onUseAgent={useAgent} /> : (
          <section className="page-content">
            <header className="page-heading"><div><p className="eyebrow">New run</p><h1>Run setup</h1><p>Test generation arrives in Phase 4.</p></div></header>
            <article className="setup-placeholder">
              <span>Selected agent</span><h2>{selectedAgent?.name ?? "Choose an agent first"}</h2>
              <p>{selectedAgent?.url ?? "Return to Agents and select “Use for new run”."}</p>
              {!selectedAgent && <button className="primary-button" onClick={() => setView("agents")}>Choose an agent</button>}
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
