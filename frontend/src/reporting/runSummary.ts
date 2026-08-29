import type { RunRecord, RunTest } from "../models";

export interface CategoryResult {
  category: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export interface RunSummary {
  tests: RunTest[];
  evaluated: number;
  passed: number;
  failed: number;
  passRate: number;
  averageLatencyMs: number;
  categories: CategoryResult[];
}

export function summarizeRun(run: RunRecord): RunSummary {
  const tests = run.iterations.flatMap((iteration) => iteration.tests);
  const evaluatedTests = tests.filter((test) => test.passed !== undefined);
  const passed = evaluatedTests.filter((test) => test.passed === true).length;
  const failed = evaluatedTests.filter((test) => test.passed === false).length;
  const latencies = tests.flatMap((test) => test.latency_ms === undefined ? [] : [test.latency_ms]);
  const grouped = new Map<string, RunTest[]>();
  evaluatedTests.forEach((test) => grouped.set(test.category, [...(grouped.get(test.category) ?? []), test]));
  const categories = [...grouped.entries()].map(([category, categoryTests]) => {
    const categoryPassed = categoryTests.filter((test) => test.passed).length;
    return {
      category,
      total: categoryTests.length,
      passed: categoryPassed,
      failed: categoryTests.length - categoryPassed,
      passRate: categoryTests.length ? categoryPassed / categoryTests.length : 0,
    };
  }).sort((a, b) => b.failed - a.failed || a.category.localeCompare(b.category));

  return {
    tests,
    evaluated: evaluatedTests.length,
    passed,
    failed,
    passRate: evaluatedTests.length ? passed / evaluatedTests.length : 0,
    averageLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : 0,
    categories,
  };
}

export function spawnedTests(run: RunRecord, testId: string): RunTest[] {
  return run.iterations.flatMap((iteration) => iteration.tests).filter((test) => test.spawned_from === testId);
}

