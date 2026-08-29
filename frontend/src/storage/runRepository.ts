import { RUN_STORAGE_PREFIX } from "../constants/storage";
import type { RunRecord } from "../models";
import { isRunRecord, parseJsonSafely } from "../validation/guards";

export class RunStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RunStorageError";
  }
}

export class RunRepository {
  constructor(private readonly storage: Storage = localStorage) {}

  list(): RunRecord[] {
    const runs: RunRecord[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (!key?.startsWith(RUN_STORAGE_PREFIX)) continue;
      const raw = this.storage.getItem(key);
      const parsed = raw === null ? undefined : parseJsonSafely(raw);
      if (isRunRecord(parsed)) runs.push(parsed);
    }
    return runs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  get(id: string): RunRecord | undefined {
    const raw = this.storage.getItem(this.keyFor(id));
    const parsed = raw === null ? undefined : parseJsonSafely(raw);
    return isRunRecord(parsed) ? parsed : undefined;
  }

  save(run: RunRecord): RunRecord {
    if (!isRunRecord(run)) throw new RunStorageError("Cannot save an invalid run record.");
    try { this.storage.setItem(this.keyFor(run.id), JSON.stringify(run)); }
    catch (error) { throw new RunStorageError("The run could not be saved in this browser.", { cause: error }); }
    return run;
  }

  createId(now = Date.now()): string {
    let timestamp = now;
    while (this.storage.getItem(`${RUN_STORAGE_PREFIX}${timestamp}`) !== null) timestamp += 1;
    return `run_${timestamp}`;
  }

  private keyFor(id: string): string {
    if (!/^run_\d+$/.test(id)) throw new RunStorageError("Run ID has an invalid format.");
    return `${RUN_STORAGE_PREFIX}${id.slice(4)}`;
  }
}

