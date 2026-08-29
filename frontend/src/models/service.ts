import type { AgentContext } from "./agent";
import type { FailureAnalysis, GeneratedTest, RecommendedTest } from "./test";

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
  failed_tests: Array<{
    id: string;
    input: string;
    expected_behaviour: string;
    actual_response: string;
  }>;
}
export interface AnalyzeResponse { analyses: FailureAnalysis[]; }

export interface RecommendRequest {
  requirements: string;
  agent_context: AgentContext;
  analyses: FailureAnalysis[];
}
export interface RecommendResponse { tests: RecommendedTest[]; }

export interface TargetExecutionResult {
  actual_response: string;
  latency_ms: number;
  status_code: number;
}
