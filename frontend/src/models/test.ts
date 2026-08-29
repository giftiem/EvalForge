export type GeneratedTestCategory =
  | "happy_path"
  | "invalid_input"
  | "edge_case"
  | "security"
  | "consistency";

export interface GeneratedTest {
  input: string;
  expected_behaviour: string;
  category: GeneratedTestCategory;
  spawned_from?: string;
}

export type FailureType =
  | "hallucination"
  | "inconsistency"
  | "scope_violation"
  | "security"
  | "instruction_following"
  | "other";

export interface FailureAnalysis {
  test_id: string;
  explanation: string;
  failure_type: FailureType;
}

export interface RunTest extends Omit<GeneratedTest, "spawned_from"> {
  id: string;
  actual_response?: string;
  latency_ms?: number;
  passed?: boolean;
  eval_reasoning?: string;
  failure_analysis: FailureAnalysis | null;
  spawned_from: string | null;
}
