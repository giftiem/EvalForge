import type {
  AgentProfile, AnalyzeResponse, EvaluateResponse, FailureAnalysis, GenerateResponse,
  GeneratedTest, RecommendResponse, RecommendedTest, RunRecord,
} from "../models";

type JsonRecord = Record<string, unknown>;
const TEST_CATEGORIES = new Set(["happy_path", "invalid_input", "edge_case", "security", "consistency"]);
const FAILURE_TYPES = new Set(["hallucination", "inconsistency", "scope_violation", "security", "instruction_following", "other"]);
const RUN_STATUSES = new Set(["generating", "running", "evaluating", "analyzing", "adapting", "completed", "failed"]);

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

export function isAgentProfile(value: unknown): value is AgentProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" && typeof value.name === "string" &&
    typeof value.url === "string" && (value.method === "GET" || value.method === "POST") &&
    isStringRecord(value.headers) && typeof value.body_template === "string" &&
    typeof value.response_path === "string" &&
    (value.system_prompt === undefined || typeof value.system_prompt === "string") &&
    (value.description === undefined || typeof value.description === "string") &&
    typeof value.created_at === "string"
  );
}

export function isGeneratedTest(value: unknown): value is GeneratedTest {
  if (!isRecord(value)) return false;
  return (
    typeof value.input === "string" && typeof value.expected_behaviour === "string" &&
    typeof value.category === "string" && TEST_CATEGORIES.has(value.category)
  );
}

export function isRecommendedTest(value: unknown): value is RecommendedTest {
  if (!isRecord(value)) return false;
  return typeof value.input === "string" && typeof value.expected_behaviour === "string" &&
    typeof value.category === "string" && typeof value.spawned_from === "string";
}

export function isFailureAnalysis(value: unknown): value is FailureAnalysis {
  if (!isRecord(value)) return false;
  return (
    typeof value.test_id === "string" && typeof value.explanation === "string" &&
    typeof value.failure_type === "string" && FAILURE_TYPES.has(value.failure_type)
  );
}

export function isRunRecord(value: unknown): value is RunRecord {
  if (!isRecord(value) || !isRecord(value.agent_snapshot)) return false;
  return (
    value.schema_version === 1 && typeof value.id === "string" &&
    typeof value.agent_id === "string" && typeof value.requirements === "string" &&
    typeof value.status === "string" && RUN_STATUSES.has(value.status) &&
    Array.isArray(value.iterations) && typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

export function parseJsonSafely(value: string): unknown {
  try { return JSON.parse(value) as unknown; } catch { return undefined; }
}

export function isGenerateResponse(value: unknown): value is GenerateResponse {
  return isRecord(value) && Array.isArray(value.tests) && value.tests.every(isGeneratedTest);
}

export function isEvaluateResponse(value: unknown): value is EvaluateResponse {
  return isRecord(value) && typeof value.passed === "boolean" && typeof value.reasoning === "string";
}

export function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  return isRecord(value) && Array.isArray(value.analyses) && value.analyses.every(isFailureAnalysis);
}

export function isRecommendResponse(value: unknown): value is RecommendResponse {
  return isRecord(value) && Array.isArray(value.tests) && value.tests.every(isRecommendedTest);
}
