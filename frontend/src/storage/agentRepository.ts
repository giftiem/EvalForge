import { AGENTS_STORAGE_KEY } from "../constants/storage";
import type { AgentProfile } from "../models";
import { isAgentProfile, parseJsonSafely } from "../validation/guards";

export class AgentStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AgentStorageError";
  }
}

export class AgentRepository {
  constructor(private readonly storage: Storage = localStorage) {}

  list(): AgentProfile[] {
    const raw = this.storage.getItem(AGENTS_STORAGE_KEY);
    if (raw === null) return [];
    const parsed = parseJsonSafely(raw);
    if (!Array.isArray(parsed)) return [];

    const unique = new Map<string, AgentProfile>();
    parsed.filter(isAgentProfile).forEach((agent) => unique.set(agent.id, agent));
    return [...unique.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  get(id: string): AgentProfile | undefined {
    return this.list().find((agent) => agent.id === id);
  }

  save(agent: AgentProfile): AgentProfile {
    if (!isAgentProfile(agent)) throw new AgentStorageError("Cannot save an invalid agent profile.");
    const agents = this.list();
    const existingIndex = agents.findIndex((item) => item.id === agent.id);
    if (existingIndex >= 0) agents[existingIndex] = agent;
    else agents.push(agent);
    this.write(agents);
    return agent;
  }

  delete(id: string): boolean {
    const agents = this.list();
    const remaining = agents.filter((agent) => agent.id !== id);
    if (remaining.length === agents.length) return false;
    this.write(remaining);
    return true;
  }

  private write(agents: AgentProfile[]): void {
    try {
      this.storage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
    } catch (error) {
      throw new AgentStorageError("Agent profiles could not be saved in this browser.", { cause: error });
    }
  }
}

