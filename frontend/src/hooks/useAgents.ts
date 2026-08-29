import { useCallback, useMemo, useState } from "react";
import type { AgentProfile } from "../models";
import { AgentRepository } from "../storage/agentRepository";

export function useAgents() {
  const repository = useMemo(() => new AgentRepository(), []);
  const [agents, setAgents] = useState(() => repository.list());
  const [storageError, setStorageError] = useState<string>();

  const saveAgent = useCallback((agent: AgentProfile) => {
    try {
      repository.save(agent);
      setAgents(repository.list());
      setStorageError(undefined);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "The agent could not be saved.");
      throw error;
    }
  }, [repository]);

  const deleteAgent = useCallback((id: string) => {
    try {
      repository.delete(id);
      setAgents(repository.list());
      setStorageError(undefined);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "The agent could not be deleted.");
    }
  }, [repository]);

  return { agents, deleteAgent, saveAgent, storageError };
}

