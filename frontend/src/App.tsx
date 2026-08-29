import { useState } from "react";
import type { AgentProfile, RunRecord } from "./models";
import { AgentsPage } from "./pages/AgentsPage";
import { RunPreviewPage } from "./pages/RunPreviewPage";
import { SetupPage } from "./pages/SetupPage";
import "./styles/global.css";

type View = "agents" | "setup" | "run" | "results";

export default function App() {
  const [view, setView] = useState<View>("agents");
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [currentRun, setCurrentRun] = useState<RunRecord>();

  function useAgent(agent: AgentProfile) {
    setSelectedAgentId(agent.id);
    setView("setup");
  }

  function openRun(run: RunRecord, historical = false) {
    setCurrentRun(run);
    setView(historical ? "results" : "run");
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("agents")}><span>E</span>EvalForge</button>
        <nav aria-label="Main navigation">
          <button className={view === "agents" ? "active" : ""} onClick={() => setView("agents")}><span>◎</span>Agents</button>
          <button className={view === "setup" ? "active" : ""} onClick={() => setView("setup")}><span>＋</span>New run</button>
          <button className={view === "run" ? "active" : ""} disabled={!currentRun} onClick={() => setView("run")}><span>◫</span>Run</button>
          <button className={view === "results" ? "active" : ""} disabled={!currentRun} onClick={() => setView("results")}><span>▥</span>Results</button>
        </nav>
        <div className="sidebar-foot"><span className="status-dot" />Reasoning service configured</div>
      </aside>
      <main className="main-area">
        {view === "agents" && <AgentsPage onUseAgent={useAgent} />}
        {view === "setup" && <SetupPage initialAgentId={selectedAgentId} onManageAgents={() => setView("agents")} onRunCreated={(run) => openRun(run)} onRunOpen={(run) => openRun(run, true)} />}
        {(view === "run" || view === "results") && currentRun && <RunPreviewPage run={currentRun} historical={view === "results"} onBack={() => setView("setup")} />}
      </main>
    </div>
  );
}
