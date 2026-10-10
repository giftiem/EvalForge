import { useState } from "react";
import { useTheme } from "./hooks/useTheme";
import type { AgentProfile, RunRecord } from "./models";
import { AgentsPage } from "./pages/AgentsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RunPage } from "./pages/RunPage";
import { ResultsPage } from "./pages/ResultsPage";
import { SetupPage } from "./pages/SetupPage";
import "./styles/global.css";
import "./styles/run.css";
import "./styles/theme.css";

type View = "dashboard" | "agents" | "setup" | "run" | "results";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [currentRun, setCurrentRun] = useState<RunRecord>();
  const [createAgentOnOpen, setCreateAgentOnOpen] = useState(false);
  const [agentArchive, setAgentArchive] = useState<File>();
  const { theme, toggleTheme } = useTheme();

  function useAgent(agent: AgentProfile) { setSelectedAgentId(agent.id); setView("setup"); }
  function openRun(run: RunRecord, historical = false) { setCurrentRun(run); setView(historical ? "results" : "run"); }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("dashboard")}><span>EF</span><b>EvalForge</b></button>
        <nav aria-label="Main navigation">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}><span>⌁</span>Overview</button>
          <button className={view === "agents" ? "active" : ""} onClick={() => { setCreateAgentOnOpen(false); setView("agents"); }}><span>◎</span>Agents</button>
          <button className={view === "setup" ? "active" : ""} onClick={() => setView("setup")}><span>＋</span>New run</button>
          <button className={view === "run" ? "active" : ""} disabled={!currentRun} onClick={() => setView("run")}><span>◫</span>Live run</button>
          <button className={view === "results" ? "active" : ""} disabled={!currentRun} onClick={() => setView("results")}><span>▥</span>Results</button>
        </nav>
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span><b>{theme === "dark" ? "Light mode" : "Dark mode"}</b></button>
        <div className="sidebar-foot"><span className="status-dot" /><div><strong>System operational</strong><small>Reasoning service online</small></div></div>
      </aside>
      <main className="main-area">
        <header className="app-topbar"><div><span className="topbar-status"><i />Live workspace</span></div><div><button aria-label="Notifications">○</button><span className="user-avatar">EF</span><div><strong>EvalForge</strong><small>Local workspace</small></div></div></header>
        {view === "dashboard" && <DashboardPage onManageAgents={() => { setCreateAgentOnOpen(false); setView("agents"); }} onAddAgent={() => { setCreateAgentOnOpen(true); setView("agents"); }} onNewRun={() => setView("setup")} onOpenRun={(run) => openRun(run, run.status === "completed")} />}
        {view === "agents" && <AgentsPage initiallyOpen={createAgentOnOpen} initialArchive={agentArchive} onArchiveHandled={() => setAgentArchive(undefined)} onUseAgent={useAgent} />}
        {view === "setup" && <SetupPage initialAgentId={selectedAgentId} onImportCode={(file) => { setAgentArchive(file); setCreateAgentOnOpen(true); setView("agents"); }} onManageAgents={() => setView("agents")} onRunCreated={(run) => openRun(run)} onRunOpen={(run) => openRun(run, run.status === "completed")} />}
        {view === "run" && currentRun && <RunPage initialRun={currentRun} onBack={() => setView("setup")} onComplete={setCurrentRun} onViewResults={(run) => { setCurrentRun(run); setView("results"); }} />}
        {view === "results" && currentRun && <ResultsPage run={currentRun} onBack={() => setView("setup")} onResume={() => setView("run")} />}
      </main>
    </div>
  );
}
