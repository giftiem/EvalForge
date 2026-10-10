import { useEffect, useMemo, useRef, useState } from "react";
import type { RunRecord } from "../models";
import { RunOrchestrator, type RunOptions } from "../orchestration/runOrchestrator";
import { ReasoningClient } from "../services/reasoningClient";
import { TargetClient } from "../services/targetClient";
import { RunRepository } from "../storage/runRepository";
import { TestSuiteActions } from "../components/TestSuiteActions";
import type { TestDefinition } from "../reporting/testSuite";

interface RunEngine { run(runId: string, options?: RunOptions): Promise<RunRecord>; }
interface RunPageProps {
  initialRun: RunRecord;
  engine?: RunEngine;
  onBack: () => void;
  onComplete: (run: RunRecord) => void;
  onViewResults: (run: RunRecord) => void;
}

const STEPS = [
  { status: "running", label: "Run" }, { status: "evaluating", label: "Evaluate" },
  { status: "analyzing", label: "Analyse" }, { status: "adapting", label: "Adapt" },
] as const;

const TEST_CATEGORIES = [
  { value: "happy_path", label: "Happy path" },
  { value: "invalid_input", label: "Invalid input" },
  { value: "edge_case", label: "Edge case" },
  { value: "security", label: "Security" },
  { value: "consistency", label: "Consistency" },
  { value: "follow_up", label: "Follow-up" },
];

export function RunPage({ initialRun, engine, onBack, onComplete, onViewResults }: RunPageProps) {
  const runner = useMemo<RunEngine>(() => engine ?? new RunOrchestrator(new ReasoningClient(), new TargetClient()), [engine]);
  const repository = useMemo(() => new RunRepository(), []);
  const [run, setRun] = useState(initialRun);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [pauseRequested, setPauseRequested] = useState(false);
  const pause = useRef(false);
  const busy = useRef(false);
  const maxIterations = useRef(Math.max(3, initialRun.iterations.length));
  const cancellation = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => cancellation.current?.abort(), []);

  async function execute(limit = maxIterations.current) {
    if (busy.current) return;
    busy.current = true;
    maxIterations.current = limit;
    pause.current = false;
    setPauseRequested(false);
    setError(undefined);
    const controller = new AbortController();
    cancellation.current = controller;
    setIsRunning(true);
    try {
      const result = await runner.run(initialRun.id, {
        maxIterations: limit, onUpdate: setRun, signal: controller.signal,
        reviewBeforeEvaluation: true, shouldPause: () => pause.current,
      });
      setRun(result);
      if (result.status === "completed") onComplete(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The run could not be started.");
    } finally {
      setIsRunning(false);
      cancellation.current = undefined;
      busy.current = false;
      setPauseRequested(false);
    }
  }

  function editTest(id: string, field: "input" | "expected_behaviour" | "category", value: string) {
    setRun((current) => ({ ...current, iterations: current.iterations.map((iteration) => ({
      ...iteration, tests: iteration.tests.map((test) => {
        if (test.id !== id || test.passed !== undefined) return test;
        const edited = { ...test, [field]: value };
        if (field === "input" && value !== test.input) { delete edited.actual_response; delete edited.latency_ms; }
        return edited;
      }),
    })) }));
  }

  function saveDraft() {
    const draft: RunRecord = { ...run, status: "paused", updated_at: new Date().toISOString() };
    repository.save(draft);
    setRun(draft);
  }

  function importTests(definitions: TestDefinition[]) {
    if (busy.current || run.status === "completed") return;
    const next = structuredClone(run);
    const iteration = next.iterations.at(-1)!;
    let number = Math.max(0, ...next.iterations.flatMap((item) => item.tests.map((test) => Number(test.id.match(/^t(\d+)$/)?.[1] ?? 0)))) + 1;
    iteration.tests = [...iteration.tests.filter((test) => test.passed !== undefined), ...definitions.map((test) => ({ ...test, id: `t${number++}`, failure_analysis: null, spawned_from: null }))];
    iteration.tests_reviewed = false;
    next.status = "paused";
    next.updated_at = new Date().toISOString();
    repository.save(next);
    setRun(next);
    setError(undefined);
  }

  function approveAndStart() {
    if (busy.current) return;
    if (run.iterations.some((iteration) => iteration.tests.some((test) => !test.input.trim() || !test.expected_behaviour.trim() || !test.category.trim()))) {
      setError("Every test needs an input, expected behaviour, and category.");
      return;
    }
    try {
      const approved = { ...run, updated_at: new Date().toISOString(), iterations: run.iterations.map((iteration) => ({ ...iteration, tests_reviewed: true })) };
      repository.save(approved);
      setRun(approved);
      void execute();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save the reviewed tests."); }
  }

  function leaveRun() {
    cancellation.current?.abort();
    if (!busy.current && run.status !== "completed") {
      try { saveDraft(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save tests."); return; }
    }
    onBack();
  }

  const tests = run.iterations.flatMap((iteration) => iteration.tests);
  const evaluated = tests.filter((test) => test.passed !== undefined);
  const passed = evaluated.filter((test) => test.passed).length;
  const passRate = evaluated.length ? Math.round((passed / evaluated.length) * 100) : 0;
  const canExtend = run.status === "completed" && run.iterations.at(-1)?.tests.some((test) => test.passed === false);

  return (
    <section className="page-content run-page">
      <header className="page-heading">
        <div><p className="eyebrow">Live evaluation</p><h1>{run.agent_snapshot.name}</h1><p>Iteration {run.iterations.length} · {evaluated.length} of {tests.length} tests evaluated</p></div>
        <div className="heading-actions">{isRunning && <button className="danger-button" onClick={() => cancellation.current?.abort()}>Cancel run</button>}<button className="secondary-button" onClick={leaveRun}>← Back to setup</button></div>
      </header>
      <div className="run-stepper" aria-label="Run progress">
        <Step label="Generate" state="done" />
        <Step label="Review" state={isRunning || run.status === "completed" ? "done" : "active"} />
        {STEPS.map((step) => <Step key={step.status} label={step.label} state={stepState(run, step.status, isRunning)} />)}
      </div>
      {error && <p className="run-error" role="alert">{error}</p>}
      <TestSuiteActions tests={run.iterations.flatMap((iteration) => iteration.tests)} onImport={run.status !== "completed" ? importTests : undefined} disabled={isRunning} />
      {!isRunning && run.status !== "completed" && <p className="suite-hint">Import replaces pending tests in the latest iteration. Completed tests are kept.</p>}
      {run.status === "failed" && <div className="run-error" role="alert"><div><strong>{STEPS.find((step) => step.status === run.failed_step)?.label ?? "Run"} stopped</strong><span>{run.current_step_error}</span></div></div>}
      {isRunning ? (
        <div className="review-toolbar"><p>{pauseRequested ? "Pausing after the current request finishes..." : "You can pause to review the remaining tests."}</p><button className="secondary-button" disabled={pauseRequested} onClick={() => { pause.current = true; setPauseRequested(true); }}>Pause and review</button></div>
      ) : run.status !== "completed" && (
        <section className="test-review"><h2>Review tests before evaluation</h2><p>Edit pending tests below, then approve them to start or resume. Follow-up tests also stop here for review.</p><div className="heading-actions"><button className="primary-button" onClick={approveAndStart}>Approve tests and evaluate</button><button className="secondary-button" onClick={() => { try { saveDraft(); setError(undefined); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save tests."); } }}>Save review</button></div></section>
      )}
      <section className="run-metrics"><article><span>Pass rate</span><strong>{passRate}%</strong></article><article><span>Tests evaluated</span><strong>{evaluated.length}<small> / {tests.length}</small></strong></article><article><span>Passed</span><strong className="pass-text">{passed}</strong></article><article><span>Current iteration</span><strong>{run.iterations.length}</strong></article></section>
      <div className="iteration-feed">{run.iterations.map((iteration) => (
        <section className="iteration-section" key={iteration.iteration_number}>
          <header><div><span>Iteration {iteration.iteration_number}</span><strong>{Math.round(iteration.pass_rate * 100)}% pass rate</strong></div><small>{iteration.tests.length} tests</small></header>
          {iteration.tests.map((test) => (
            <article className="live-test-card" key={test.id}>
              <div className="test-card-head"><div><span>{test.id}</span><em>{test.category.replaceAll("_", " ")}</em>{test.spawned_from && <small>from {test.spawned_from}</small>}</div><Verdict passed={test.passed} hasResponse={test.actual_response !== undefined} /></div>
              <div className="test-copy">
                {!isRunning && test.passed === undefined ? <>
                  <label className="field"><span>Input</span><textarea aria-label={`Input ${test.id}`} rows={3} value={test.input} onChange={(event) => editTest(test.id, "input", event.target.value)} /></label>
                  <label className="field"><span>Expected behaviour</span><textarea aria-label={`Expected behaviour ${test.id}`} rows={3} value={test.expected_behaviour} onChange={(event) => editTest(test.id, "expected_behaviour", event.target.value)} /></label>
                  <label className="field"><span>Category</span><select aria-label={`Category ${test.id}`} value={test.category} onChange={(event) => editTest(test.id, "category", event.target.value)}>
                    {!TEST_CATEGORIES.some((category) => category.value === test.category) && <option value={test.category}>{test.category.replaceAll("_", " ")} (existing category)</option>}
                    {TEST_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select></label>
                </> : <><label>Input</label><p>{test.input}</p><label>Expected behaviour</label><p>{test.expected_behaviour}</p></>}
                {test.actual_response !== undefined && <><label>Actual response <small>{test.latency_ms} ms</small></label><blockquote>{test.actual_response}</blockquote></>}
                {test.eval_reasoning && <div className={`evaluation-note ${test.passed ? "pass" : "fail"}`}><strong>Evaluator</strong><span>{test.eval_reasoning}</span></div>}
                {test.failure_analysis && <div className="analysis-note"><strong>{test.failure_analysis.failure_type.replaceAll("_", " ")}</strong><span>{test.failure_analysis.explanation}</span></div>}
              </div>
            </article>
          ))}
        </section>
      ))}</div>
      {run.status === "completed" && <div className="run-complete"><div><span className="ready-check">✓</span><div><strong>Run complete</strong><p>{run.iterations.length} iteration{run.iterations.length === 1 ? "" : "s"} finished and saved.</p></div></div><div className="complete-actions">{canExtend && <button className="secondary-button" disabled={isRunning} onClick={() => void execute(run.iterations.length + 1)}>Run another iteration</button>}<button className="primary-button" onClick={() => onViewResults(run)}>View results</button></div></div>}
    </section>
  );
}

function Step({ label, state }: { label: string; state: "pending" | "active" | "done" | "error" }) {
  return <div className={`run-step ${state}`}><span>{state === "done" ? "✓" : state === "error" ? "!" : ""}</span><strong>{label}</strong></div>;
}
function stepState(run: RunRecord, status: (typeof STEPS)[number]["status"], isRunning: boolean): "pending" | "active" | "done" | "error" {
  if (run.status === "completed") return "done";
  if (run.status === "failed") return run.failed_step === status ? "error" : "pending";
  if (!isRunning) return "pending";
  const order = STEPS.findIndex((step) => step.status === status);
  const current = STEPS.findIndex((step) => step.status === run.status);
  return order < current ? "done" : order === current ? "active" : "pending";
}
function Verdict({ passed, hasResponse }: { passed?: boolean; hasResponse: boolean }) {
  if (passed === true) return <span className="verdict pass">● Passed</span>;
  if (passed === false) return <span className="verdict fail">● Failed</span>;
  if (hasResponse) return <span className="verdict pending">● Awaiting evaluation</span>;
  return <span className="verdict pending">○ Pending</span>;
}
