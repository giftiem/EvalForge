import type { RunRecord } from "../models";

export function exportRunAsJson(run: RunRecord): void {
  const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `evalforge-${run.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

