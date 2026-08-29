import type { AgentSnapshot } from "./agent";
import type { RunTest } from "./test";

export type RunStatus =
  | "generating" | "running" | "evaluating" | "analyzing"
  | "adapting" | "completed" | "failed";

export interface RunIteration {
  iteration_number: number;
  tests: RunTest[];
  pass_rate: number;
}

export interface RunRecord {
  schema_version: 1;
  id: string;
  agent_id: string;
  agent_snapshot: AgentSnapshot;
  requirements: string;
  constraints?: string;
  status: RunStatus;
  failed_step?: Exclude<RunStatus, "failed" | "completed">;
  current_step_error?: string;
  iterations: RunIteration[];
  created_at: string;
  updated_at: string;
}
