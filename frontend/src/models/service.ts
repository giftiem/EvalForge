import type { AgentContext } from "./agent";
import type { FailureAnalysis, GeneratedTest, RunTest } from "./test";

export interface GenerateRequest {
  requirements: string;
  constraints?: string;
  agent_context: AgentContext;
  num_tests: number;
}
export interface GenerateResponse { tests: GeneratedTest[]; }

export interface EvaluateRequest {
  input: string;
  expected_behaviour: string;
  actual_response: string;
  agent_context: AgentContext;
}
export interface EvaluateResponse { passed: boolean; reasoning: string; }

export interface AnalyzeRequest {
  requirements: string;
  agent_context: AgentContext;
  failed_tests: Pick<RunTest, "id" | "input" | "expected_behaviour" | "actual_response">[];
}
export interface AnalyzeResponse { analyses: FailureAnalysis[]; }

export interface RecommendRequest {
  requirements: string;
  agent_context: AgentContext;
  analyses: FailureAnalysis[];
}
export interface RecommendResponse { tests: GeneratedTest[]; }
