import type { AgentProfile, GenerateRequest, GenerateResponse, RunRecord } from "../models";
import { RunRepository } from "../storage/runRepository";

export interface GenerateClient { generate(request: GenerateRequest): Promise<GenerateResponse>; }

interface CreateInitialRunInput {
  agent: AgentProfile;
  requirements: string;
  constraints?: string;
  numTests?: number;
}

export async function createInitialRun(
  input: CreateInitialRunInput,
  client: GenerateClient,
  repository = new RunRepository(),
): Promise<RunRecord> {
  const requirements = input.requirements.trim();
  const constraints = input.constraints?.trim();
  const agentContext = {
    ...(input.agent.system_prompt && { system_prompt: input.agent.system_prompt }),
    ...(input.agent.description && { description: input.agent.description }),
  };
  const generated = await client.generate({
    requirements,
    ...(constraints && { constraints }),
    agent_context: agentContext,
    num_tests: input.numTests ?? 10,
  });
  if (generated.tests.length === 0) throw new Error("Test generation returned an empty suite.");

  const now = new Date().toISOString();
  const agentSnapshot = {
    name: input.agent.name,
    url: input.agent.url,
    method: input.agent.method,
    headers: { ...input.agent.headers },
    body_template: input.agent.body_template,
    response_path: input.agent.response_path,
    ...(input.agent.system_prompt && { system_prompt: input.agent.system_prompt }),
    ...(input.agent.description && { description: input.agent.description }),
  };
  const run: RunRecord = {
    schema_version: 1,
    id: repository.createId(),
    agent_id: input.agent.id,
    agent_snapshot: agentSnapshot,
    requirements,
    ...(constraints && { constraints }),
    status: "running",
    iterations: [{
      iteration_number: 1,
      pass_rate: 0,
      tests: generated.tests.map((test, index) => ({
        ...test, id: `t${index + 1}`, failure_analysis: null, spawned_from: null,
      })),
    }],
    created_at: now,
    updated_at: now,
  };
  return repository.save(run);
}
