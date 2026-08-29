import type { RunRecord } from "../models";
import { exportRunAsJson } from "../reporting/exportRun";
import { spawnedTests, summarizeRun } from "../reporting/runSummary";

interface ResultsPageProps { run: RunRecord; onBack: () => void; onResume: () => void; }

export function ResultsPage({ run, onBack, onResume }: ResultsPageProps) {
  const summary = summarizeRun(run);
  return (
    <section className="page-content results-page">
      <header className="page-heading"><div><p className="eyebrow">Evaluation results</p><h1>{run.agent_snapshot.name}</h1><p>{run.requirements}</p></div><div className="heading-actions"><button className="secondary-button" onClick={onBack}>← Back</button><button className="primary-button" onClick={() => exportRunAsJson(run)}>↓ Export JSON</button></div></header>

      {run.status !== "completed" && <div className="results-warning"><div><strong>This run is incomplete</strong><span>Results include only evidence saved so far.</span></div><button className="primary-button" onClick={onResume}>Resume run</button></div>}

      <section className="results-hero">
        <div className="result-score"><strong>{Math.round(summary.passRate * 100)}%</strong><span>overall pass rate</span></div>
        <div className="result-stat"><span>Passed</span><strong className="pass-text">{summary.passed}</strong></div>
        <div className="result-stat"><span>Failed</span><strong className="fail-text">{summary.failed}</strong></div>
        <div className="result-stat"><span>Tests</span><strong>{summary.evaluated}</strong></div>
        <div className="result-stat"><span>Average latency</span><strong>{summary.averageLatencyMs}<small> ms</small></strong></div>
      </section>

      <div className="results-grid">
        <section className="results-panel"><div className="section-heading"><div><h2>Failure breakdown</h2><p>Quality by generated test category.</p></div></div>{summary.categories.length === 0 ? <p className="empty-row">No evaluated categories yet.</p> : <div className="category-results">{summary.categories.map((category) => <div key={category.category}><div><span>{category.category.replaceAll("_", " ")}</span><strong>{category.failed} failed · {Math.round(category.passRate * 100)}%</strong></div><div className="result-bar"><i style={{ width: `${category.passRate * 100}%` }} /></div></div>)}</div>}</section>
        <section className="results-panel"><div className="section-heading"><div><h2>Pass rate by iteration</h2><p>Performance across adaptive rounds.</p></div></div><div className="iteration-chart">{run.iterations.map((iteration) => <div key={iteration.iteration_number}><div className="chart-track"><i style={{ height: `${Math.max(3, iteration.pass_rate * 100)}%` }}><span>{Math.round(iteration.pass_rate * 100)}%</span></i></div><strong>Round {iteration.iteration_number}</strong></div>)}</div></section>
      </div>

      <section className="evidence-section"><div className="section-heading"><div><h2>Test evidence</h2><p>Inputs, outputs, verdicts, and adaptive relationships.</p></div><span>{summary.tests.length} tests</span></div>
        <div className="evidence-list">{summary.tests.map((test) => { const children = spawnedTests(run, test.id); return <details key={test.id} className={test.passed === false ? "failed" : ""}><summary><div><span>{test.id}</span><strong>{test.input}</strong><em>{test.category.replaceAll("_", " ")}</em></div><div><Verdict passed={test.passed} /><b>⌄</b></div></summary><div className="evidence-body"><Evidence label="Expected behaviour" value={test.expected_behaviour} /><Evidence label="Actual response" value={test.actual_response ?? "No response captured."} /><Evidence label="Evaluator reasoning" value={test.eval_reasoning ?? "Not evaluated."} />{test.failure_analysis && <Evidence label={`Failure analysis · ${test.failure_analysis.failure_type.replaceAll("_", " ")}`} value={test.failure_analysis.explanation} />}{test.spawned_from && <Evidence label="Spawned from" value={test.spawned_from} />}{children.length > 0 && <Evidence label="Follow-up tests spawned" value={children.map((child) => `${child.id}: ${child.input}`).join("\n")} />}<div className="evidence-meta"><span>Latency: {test.latency_ms ?? "—"} ms</span><span>Iteration: {run.iterations.find((iteration) => iteration.tests.some((item) => item.id === test.id))?.iteration_number}</span></div></div></details>; })}</div>
      </section>
    </section>
  );
}

function Evidence({ label, value }: { label: string; value: string }) { return <div className="evidence-field"><strong>{label}</strong><p>{value}</p></div>; }
function Verdict({ passed }: { passed?: boolean }) { return passed === true ? <span className="verdict pass">● Passed</span> : passed === false ? <span className="verdict fail">● Failed</span> : <span className="verdict pending">○ Pending</span>; }
