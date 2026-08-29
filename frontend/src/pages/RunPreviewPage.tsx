import type { RunRecord } from "../models";

interface RunPreviewPageProps { run: RunRecord; historical?: boolean; onBack: () => void; }

export function RunPreviewPage({ run, historical, onBack }: RunPreviewPageProps) {
  const tests = run.iterations[0]?.tests ?? [];
  return (
    <section className="page-content">
      <header className="page-heading"><div><p className="eyebrow">{historical ? "Saved run" : "Test suite ready"}</p><h1>{run.agent_snapshot.name}</h1><p>{tests.length} tests generated from your requirements.</p></div><button className="secondary-button" onClick={onBack}>← Back to setup</button></header>
      <article className="run-ready-card"><div><span className="ready-check">✓</span><div><h2>{historical ? "Run loaded" : "Initial suite generated"}</h2><p>{historical ? "This run was restored from localStorage." : "Target execution and evaluation will begin in Phase 5."}</p></div></div><span className={`run-status ${run.status}`}>{run.status}</span></article>
      <div className="generated-tests">{tests.map((test) => <article key={test.id}><span>{test.id}</span><div><strong>{test.input}</strong><p>{test.expected_behaviour}</p></div><em>{test.category.replaceAll("_", " ")}</em></article>)}</div>
    </section>
  );
}
