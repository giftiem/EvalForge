export type HttpMethod = "GET" | "POST";

export interface AgentProfile {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body_template: string;
  response_path: string;
  system_prompt?: string;
  description?: string;
  created_at: string;
}

export type AgentSnapshot = Omit<AgentProfile, "id" | "created_at">;

export interface AgentContext {
  system_prompt?: string;
  description?: string;
}
