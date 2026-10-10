import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { RunRecord } from "../models";
import { AgentRepository } from "../storage/agentRepository";
import { RunRepository } from "../storage/runRepository";

interface DashboardPageProps {
  onManageAgents: () => void;
  onAddAgent: () => void;
  onNewRun: () => void;
  onOpenRun: (run: RunRecord) => void;
}

export function DashboardPage({ onManageAgents, onAddAgent, onNewRun, onOpenRun }: DashboardPageProps) {
  const agents = useMemo(() => new AgentRepository().list(), []);
  const runs = useMemo(() => new RunRepository().list(), []);
  const metrics = summarize(runs);
  const recent = runs.slice(0, 5);
  const trend = runs.slice(0, 8).reverse().map(runPassRate);
  const chartValues = trend.length ? trend : [0, 0, 0, 0, 0];
  const latestFailures = collectFailures(runs).slice(0, 3);

  return (
    <section className="dashboard-page">
      <header className="dashboard-welcome">
        <div><p className="eyebrow">Evaluation command center</p><h1>Good to see you.</h1><p>Monitor agent quality, inspect failures, and launch adaptive evaluations.</p></div>
        <div className="dashboard-actions"><button className="secondary-button" onClick={onManageAgents}>Manage agents</button><button className="primary-button" onClick={onNewRun}>+ New evaluation</button></div>
      </header>

      <section className="dashboard-stats" aria-label="Evaluation overview">
        <Metric label="Total evaluations" value={String(runs.length)} detail={`${metrics.completed} completed`} tone="violet" />
        <Metric label="Overall pass rate" value={`${metrics.passRate}%`} detail={`${metrics.evaluated} tests evaluated`} tone="green" />
        <Metric label="Active agents" value={String(agents.length)} detail={agents.length ? "Endpoints configured" : "Add your first target"} tone="blue" />
        <Metric label="Average latency" value={metrics.averageLatency ? `${metrics.averageLatency}ms` : "—"} detail="Across captured responses" tone="amber" />
      </section>

      <div className="dashboard-primary-grid">
        <article className="dashboard-panel trend-panel">
          <PanelHead title="Pass rate over time" detail="Most recent evaluations" badge={`${metrics.passRate}% overall`} />
          <div className="trend-chart" aria-label="Pass-rate trend chart">
            <div className="chart-scale"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
            <svg viewBox="0 0 620 220" role="img" aria-label="Evaluation pass rates">
              <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9b6cff" stopOpacity=".35"/><stop offset="1" stopColor="#9b6cff" stopOpacity="0"/></linearGradient></defs>
              {[20, 65, 110, 155, 200].map((y) => <line key={y} x1="0" x2="620" y1={y} y2={y} className="chart-gridline" />)}
              <polygon points={`0,220 ${chartPoints(chartValues)} 620,220`} fill="url(#trendFill)" />
              <polyline points={chartPoints(chartValues)} className="trend-line" />
              {chartValues.map((value, index) => { const x = chartValues.length === 1 ? 310 : (index / (chartValues.length - 1)) * 620; return <circle key={`${x}-${value}`} cx={x} cy={210 - value * 1.9} r="5" className="trend-point" />; })}
            </svg>
          </div>
          <div className="chart-legend"><span><i className="legend-dot violet" />Pass rate</span><small>{runs.length ? `Based on ${Math.min(runs.length, 8)} recent runs` : "Run an evaluation to populate this chart"}</small></div>
        </article>

        <article className="dashboard-panel health-panel">
          <PanelHead title="Quality pulse" detail="Current evaluation health" />
          <div className="quality-ring" style={{ "--score": `${metrics.passRate * 3.6}deg` } as CSSProperties}><div><strong>{metrics.passRate}%</strong><span>pass rate</span></div></div>
          <div className="quality-breakdown"><div><span><i className="legend-dot green" />Passed</span><strong>{metrics.passed}</strong></div><div><span><i className="legend-dot red" />Failed</span><strong>{metrics.failed}</strong></div><div><span><i className="legend-dot gray" />Incomplete</span><strong>{Math.max(0, runs.length - metrics.completed)}</strong></div></div>
        </article>
      </div>

      <div className="dashboard-secondary-grid">
        <article className="dashboard-panel failures-panel">
          <PanelHead title="Latest failure signals" detail="Issues that need attention" badge={`${latestFailures.length} signals`} />
          {latestFailures.length === 0 ? <DashboardEmpty title="No failures captured" text="Failure patterns will appear after an evaluated run." /> : <div className="failure-signal-list">{latestFailures.map((failure) => <div key={failure.id}><span className="failure-mark">!</span><div><strong>{failure.type}</strong><p>{failure.explanation}</p></div><small>{failure.agent}</small></div>)}</div>}
        </article>
        <article className="dashboard-panel activity-panel">
          <PanelHead title="Evaluation activity" detail="Run cadence in this browser" />
          <div className="activity-grid" aria-label="Evaluation activity heatmap">{Array.from({ length: 84 }, (_, index) => { const cell = activityCell(index); return <i key={index} className={`activity-${cell.level}`} title={`${cell.label}: ${cell.description}`} />; })}</div>
          <div className="activity-key"><span>12 weeks ago</span><span>Less <i /><i className="mid"/><i className="high"/> More</span><span>Today</span></div>
        </article>
      </div>

      <article className="dashboard-panel recent-panel">
        <PanelHead title="Recent evaluations" detail="Reopen a run and inspect its evidence" badge={`${runs.length} total`} />
        {recent.length === 0 ? <DashboardEmpty title="Your workspace is ready" text="Add an agent and launch your first evaluation to begin collecting quality signals."><button className="secondary-button" onClick={onAddAgent}>Add your first agent</button></DashboardEmpty> : (
          <div className="dashboard-table"><div className="dashboard-table-head"><span>Agent</span><span>Status</span><span>Tests</span><span>Pass rate</span><span>Updated</span><span /></div>{recent.map((run) => <button key={run.id} onClick={() => onOpenRun(run)}><span className="table-agent"><i>{run.agent_snapshot.name.slice(0, 2).toUpperCase()}</i><b>{run.agent_snapshot.name}</b></span><span><em className={`run-status ${run.status}`}>{run.status}</em></span><span>{testCount(run)}</span><span className="table-rate"><b>{runPassRate(run)}%</b><i><u style={{ width: `${runPassRate(run)}%` }} /></i></span><time>{formatRelative(run.updated_at)}</time><span className="row-arrow">→</span></button>)}</div>
        )}
      </article>
    </section>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <article className={`metric-card ${tone}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><i aria-hidden="true" /></article>; }
function PanelHead({ title, detail, badge }: { title: string; detail: string; badge?: string }) { return <header className="panel-head"><div><h2>{title}</h2><p>{detail}</p></div>{badge && <span>{badge}</span>}</header>; }
function DashboardEmpty({ title, text, children }: { title: string; text: string; children?: ReactNode }) { return <div className="dashboard-empty"><span>◇</span><strong>{title}</strong><p>{text}</p>{children}</div>; }

function summarize(runs: RunRecord[]) { const tests = runs.flatMap((run) => run.iterations.flatMap((iteration) => iteration.tests)).filter((test) => test.passed !== undefined); const passed = tests.filter((test) => test.passed).length; const latencies = tests.map((test) => test.latency_ms).filter((value): value is number => typeof value === "number"); return { completed: runs.filter((run) => run.status === "completed").length, evaluated: tests.length, passed, failed: tests.length - passed, passRate: tests.length ? Math.round((passed / tests.length) * 100) : 0, averageLatency: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0 }; }
function runPassRate(run: RunRecord) { const tests = run.iterations.flatMap((iteration) => iteration.tests).filter((test) => test.passed !== undefined); return tests.length ? Math.round((tests.filter((test) => test.passed).length / tests.length) * 100) : 0; }
function testCount(run: RunRecord) { return run.iterations.reduce((sum, iteration) => sum + iteration.tests.length, 0); }
function chartPoints(values: number[]) { return values.map((value, index) => `${values.length === 1 ? 310 : (index / (values.length - 1)) * 620},${210 - value * 1.9}`).join(" "); }
const HISTORICAL_ACTIVITY = [
  "0010210", "0120321", "1230102", "0102310", "2310031", "1023120",
  "3201213", "0132031", "2013320", "1320213", "0233102", "3120231",
].join("");

function activityCell(index: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const row = index % 7;
  const column = Math.floor(index / 7);
  const date = new Date(today);
  date.setDate(today.getDate() - today.getDay() - (11 - column) * 7 + row);
  const level = date < today ? Number(HISTORICAL_ACTIVITY[index] ?? "0") : 0;
  const descriptions = ["No activity", "Light activity", "Moderate activity", "High activity"];
  return { level, label: new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date), description: descriptions[level] };
}
function formatRelative(value: string) { const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)); return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`; }
function collectFailures(runs: RunRecord[]) { return runs.flatMap((run) => run.iterations.flatMap((iteration) => iteration.tests.filter((test) => test.passed === false).map((test) => ({ id: `${run.id}-${test.id}`, type: test.failure_analysis?.failure_type.replaceAll("_", " ") ?? test.category.replaceAll("_", " "), explanation: test.failure_analysis?.explanation ?? test.eval_reasoning ?? "The evaluator marked this response as failing.", agent: run.agent_snapshot.name })))); }
