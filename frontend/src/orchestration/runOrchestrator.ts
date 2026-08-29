import type {
  AnalyzeRequest, AnalyzeResponse, EvaluateRequest, EvaluateResponse, RecommendRequest,
  RecommendResponse, RunRecord, RunStatus, TargetExecutionResult,
} from "../models";
import { RunRepository } from "../storage/runRepository";

interface EvaluationClient {
  evaluate(request: EvaluateRequest, signal?: AbortSignal): Promise<EvaluateResponse>;
  analyze(request: AnalyzeRequest, signal?: AbortSignal): Promise<AnalyzeResponse>;
  recommend(request: RecommendRequest, signal?: AbortSignal): Promise<RecommendResponse>;
}

interface TargetExecutor {
  execute(agent: RunRecord["agent_snapshot"], input: string, signal?: AbortSignal): Promise<TargetExecutionResult>;
}

export interface RunOptions {
  maxIterations?: number;
  onUpdate?: (run: RunRecord) => void;
  signal?: AbortSignal;
}

export class RunOrchestrator {
  constructor(
    private readonly reasoning: EvaluationClient,
    private readonly target: TargetExecutor,
    private readonly repository = new RunRepository(),
  ) {}

  async run(runId: string, options: RunOptions = {}): Promise<RunRecord> {
    const maxIterations = options.maxIterations ?? 3;
    let run = this.repository.get(runId);
    if (!run) throw new Error("The saved run could not be found.");
    if (run.status === "completed" && run.iterations.length >= maxIterations) return run;
    let activeStep: Exclude<RunStatus, "failed" | "completed"> = "running";

    const persist = (status: RunStatus): RunRecord => {
      run = { ...run!, status, updated_at: new Date().toISOString() };
      if (status !== "failed") {
        delete run.current_step_error;
        delete run.failed_step;
      }
      this.repository.save(run);
      const snapshot = structuredClone(run);
      options.onUpdate?.(snapshot);
      return snapshot;
    };

    try {
      for (let iterationIndex = 0; iterationIndex < run.iterations.length; iterationIndex += 1) {
        const iteration = run.iterations[iterationIndex]!;

        for (const test of iteration.tests) {
          throwIfCancelled(options.signal);
          if (test.actual_response === undefined) {
            activeStep = "running";
            persist(activeStep);
            const execution = await this.target.execute(run.agent_snapshot, test.input, options.signal);
            test.actual_response = execution.actual_response;
            test.latency_ms = execution.latency_ms;
            persist(activeStep);
          }
          if (test.passed === undefined) {
            activeStep = "evaluating";
            persist(activeStep);
            const evaluation = await this.reasoning.evaluate({
              input: test.input,
              expected_behaviour: test.expected_behaviour,
              actual_response: test.actual_response,
              agent_context: agentContext(run),
            }, options.signal);
            test.passed = evaluation.passed;
            test.eval_reasoning = evaluation.reasoning;
            updatePassRate(iteration);
            persist(activeStep);
          }
        }

        updatePassRate(iteration);
        const failedTests = iteration.tests.filter((test) => test.passed === false);
        if (failedTests.length === 0) return persist("completed");

        if (failedTests.some((test) => test.failure_analysis === null)) {
          activeStep = "analyzing";
          persist(activeStep);
          const result = await this.reasoning.analyze({
            requirements: run.requirements,
            agent_context: agentContext(run),
            failed_tests: failedTests.map((test) => ({
              id: test.id,
              input: test.input,
              expected_behaviour: test.expected_behaviour,
              actual_response: test.actual_response!,
            })),
          }, options.signal);
          const analyses = new Map(result.analyses.map((analysis) => [analysis.test_id, analysis]));
          failedTests.forEach((test) => {
            const analysis = analyses.get(test.id);
            if (!analysis) throw new Error(`Failure analysis was missing for ${test.id}.`);
            test.failure_analysis = analysis;
          });
          persist(activeStep);
        }

        if (iteration.iteration_number >= maxIterations) return persist("completed");
        if (run.iterations[iterationIndex + 1]) continue;

        activeStep = "adapting";
        persist(activeStep);
        const recommendation = await this.reasoning.recommend({
          requirements: run.requirements,
          agent_context: agentContext(run),
          analyses: failedTests.map((test) => test.failure_analysis!),
        }, options.signal);
        if (recommendation.tests.length === 0) throw new Error("Adaptive generation returned no follow-up tests.");
        let nextId = nextTestNumber(run);
        run.iterations.push({
          iteration_number: iteration.iteration_number + 1,
          pass_rate: 0,
          tests: recommendation.tests.map((test) => ({
            ...test,
            id: `t${nextId++}`,
            failure_analysis: null,
            spawned_from: test.spawned_from,
          })),
        });
        persist("running");
      }
      return persist("completed");
    } catch (error) {
      run = {
        ...run,
        status: "failed",
        failed_step: activeStep,
        current_step_error: options.signal?.aborted ? "Run cancelled by the user." : error instanceof Error ? error.message : "The run stopped unexpectedly.",
        updated_at: new Date().toISOString(),
      };
      this.repository.save(run);
      options.onUpdate?.(structuredClone(run));
      return run;
    }
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Run cancelled", "AbortError");
}

function agentContext(run: RunRecord) {
  return {
    ...(run.agent_snapshot.system_prompt && { system_prompt: run.agent_snapshot.system_prompt }),
    ...(run.agent_snapshot.description && { description: run.agent_snapshot.description }),
  };
}

function updatePassRate(iteration: RunRecord["iterations"][number]): void {
  const evaluated = iteration.tests.filter((test) => test.passed !== undefined);
  iteration.pass_rate = evaluated.length === 0 ? 0 : evaluated.filter((test) => test.passed).length / evaluated.length;
}

function nextTestNumber(run: RunRecord): number {
  return run.iterations.flatMap((iteration) => iteration.tests)
    .reduce((maximum, test) => Math.max(maximum, Number(test.id.match(/^t(\d+)$/)?.[1] ?? 0)), 0) + 1;
}
