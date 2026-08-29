import { EVALFORGE_SERVICE_BASE_URL } from "./constants/api";
import "./styles/global.css";

export default function App() {
  return (
    <main className="app-shell">
      <section className="foundation-card">
        <div className="brand-mark" aria-hidden="true">E</div>
        <p className="eyebrow">EvalForge</p>
        <h1>AI agent testing workspace</h1>
        <p className="summary">
          The React foundation is ready. Agent profiles, test runs, and evaluation screens will be
          built on these validated data contracts.
        </p>
        <dl>
          <div><dt>Reasoning service</dt><dd>{EVALFORGE_SERVICE_BASE_URL}</dd></div>
          <div><dt>Storage</dt><dd>Browser localStorage</dd></div>
          <div><dt>Runtime</dt><dd>React + TypeScript</dd></div>
        </dl>
      </section>
    </main>
  );
}
