import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RunRecord, RunStatus } from "../models";
import { RunOrchestrator } from "../orchestration/runOrchestrator";
import { ReasoningClient } from "../services/reasoningClient";
import { TargetClient } from "../services/targetClient";

interface RunEngine {
  run(runId: string, options?: { maxIterations?: number; onUpdate?: (run: RunRecord) => void; signal?: AbortSignal }): Promise<RunRecord>;
}

interface RunPageProps {
  initialRun: RunRecord;
  engine?: RunEngine;
  onBack: () => void;
  onComplete: (run: RunRecord) => void;
  onViewResults: (run: RunRecord) => void;
}

const STEPS: Array<{ status: Exclude<RunStatus, "failed" | "completed" | "generating">; label: string }> = [
  { status: "running", label: "Run" }, { status: "evaluating", label: "Evaluate" },
  { status: "analyzing", label: "Analyse" }, { status: "adapting", label: "Adapt" },
];

export function RunPage({ initialRun, engine, onBack, onComplete, onViewResults }: RunPageProps) {
  const runner = useMemo<RunEngine>(() => engine ?? new RunOrchestrator(new ReasoningClient(), new TargetClient()), [engine]);
  const [run, setRun] = useState(initialRun);
  const [isRunning, setIsRunning] = useState(initialRun.status !== "completed");
  const started = useRef(false);
  const cancellation = useRef<AbortController | undefined>(undefined);

  const execute = useCallback(async (maxIterations = 3) => {
    const controller = new AbortController();
    cancellation.current = controller;
    setIsRunning(true);
    const result = await runner.run(initialRun.id, { maxIterations, onUpdate: setRun, signal: controller.signal });
    setRun(result);
    setIsRunning(false);
    cancellation.current = undefined;
    if (result.status === "completed") onComplete(result);
  }, [initialRun.id, onComplete, runner]);

  useEffect(() => {
    if (started.current || initialRun.status === "completed") return;
    started.current = true;
    void execute();
  }, [execute, initialRun.status]);

  const tests = run.iterations.flatMap((iteration) => iteration.tests);
  const evaluated = tests.filter((test) => test.passed !== undefined);
  const passed = evaluated.filter((test) => test.passed).length;
  const passRate = evaluated.length ? Math.round((passed / evaluated.length) * 100) : 0;
  const canExtend = run.status === "completed" && run.iterations.at(-1)?.tests.some((test) => test.passed === false);
  const leaveRun = () => {
    cancellation.current?.abort();
    onBack();
  };

  return (
    <section className="page-content run-page">
      <header className="page-heading"><div><p className="eyebrow">Live evaluation</p><h1>{run.agent_snapshot.name}</h1><p>Iteration {run.iterations.length} · {evaluated.length} of {tests.length} tests evaluated</p></div><div className="heading-actions">{isRunning && <button className="danger-button" onClick={() => cancellation.current?.abort()}>Cancel run</button>}<button className="secondary-button" onClick={leaveRun}>← Back to setup</button></div></header>

      <div className="run-stepper" aria-label="Run progress">
        <Step label="Generate" state="done" />
        {STEPS.map((step) => <Step key={step.status} label={step.label} state={stepState(run, step.status)} />)}
      </div>

      {run.status === "failed" && <div className="run-error" role="alert"><div><strong>{stepLabel(run.failed_step)} stopped</strong><span>{run.current_step_error}</span></div><button className="primary-button" disabled={isRunning} onClick={() => void execute(Math.max(3, run.iterations.length))}>Retry step</button></div>}

      <section className="run-metrics"><article><span>Pass rate</span><strong>{passRate}%</strong></article><article><span>Tests evaluated</span><strong>{evaluated.length}<small> / {tests.length}</small></strong></article><article><span>Passed</span><strong className="pass-text">{passed}</strong></article><article><span>Current iteration</span><strong>{run.iterations.length}</strong></article></section>

      <div className="iteration-feed">
        {run.iterations.map((iteration) => (
          <section className="iteration-section" key={iteration.iteration_number}>
            <header><div><span>Iteration {iteration.iteration_number}</span><strong>{Math.round(iteration.pass_rate * 100)}% pass rate</strong></div><small>{iteration.tests.length} tests</small></header>
            {iteration.tests.map((test) => (
              <article className="live-test-card" key={test.id}>
                <div className="test-card-head"><div><span>{test.id}</span><em>{test.category.replaceAll("_", " ")}</em>{test.spawned_from && <small>from {test.spawned_from}</small>}</div><Verdict passed={test.passed} hasResponse={test.actual_response !== undefined} /></div>
                <div className="test-copy"><label>Input</label><p>{test.input}</p><label>Expected behaviour</label><p>{test.expected_behaviour}</p>{test.actual_response !== undefined && <><label>Actual response <small>{test.latency_ms} ms</small></label><blockquote>{test.actual_response}</blockquote></>}{test.eval_reasoning && <div className={`evaluation-note ${test.passed ? "pass" : "fail"}`}><strong>Evaluator</strong><span>{test.eval_reasoning}</span></div>}{test.failure_analysis && <div className="analysis-note"><strong>{test.failure_analysis.failure_type.replaceAll("_", " ")}</strong><span>{test.failure_analysis.explanation}</span></div>}</div>
              </article>
            ))}
          </section>
        ))}
      </div>

      {run.status === "completed" && <div className="run-complete"><div><span className="ready-check">✓</span><div><strong>Run complete</strong><p>{run.iterations.length} iteration{run.iterations.length === 1 ? "" : "s"} finished and saved.</p></div></div><div className="complete-actions">{canExtend && <button className="secondary-button" disabled={isRunning} onClick={() => void execute(run.iterations.length + 1)}>{isRunning ? "Running…" : "Run another iteration"}</button>}<button className="primary-button" onClick={() => onViewResults(run)}>View results</button></div></div>}
    </section>
  );
}

function Step({ label, state }: { label: string; state: "pending" | "active" | "done" | "error" }) {
  return <div className={`run-step ${state}`}><span>{state === "done" ? "✓" : state === "error" ? "!" : ""}</span><strong>{label}</strong></div>;
}

function stepState(run: RunRecord, status: (typeof STEPS)[number]["status"]): "pending" | "active" | "done" | "error" {
  if (run.status === "completed") return "done";
  if (run.status === "failed") return run.failed_step === status ? "error" : "pending";
  const order = STEPS.findIndex((step) => step.status === status);
  const current = STEPS.findIndex((step) => step.status === run.status);
  return order < current ? "done" : order === current ? "active" : "pending";
}

function stepLabel(status?: RunRecord["failed_step"]): string {
  return STEPS.find((step) => step.status === status)?.label ?? "Run";
}

function Verdict({ passed, hasResponse }: { passed?: boolean; hasResponse: boolean }) {
  if (passed === true) return <span className="verdict pass">● Passed</span>;
  if (passed === false) return <span className="verdict fail">● Failed</span>;
  if (hasResponse) return <span className="verdict pending">● Evaluating</span>;
  return <span className="verdict pending">○ Pending</span>;
}
