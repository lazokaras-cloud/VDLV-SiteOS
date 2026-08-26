import type { FlowState, PersistedFlow } from "./types";

const PREFIX = "siteos.flow.";

export function loadFlow(flowId: string): PersistedFlow | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + flowId);
    if (raw === null) return undefined;
    return JSON.parse(raw) as PersistedFlow;
  } catch {
    return undefined;
  }
}

export function saveFlow(flowId: string, stepIndex: number, state: FlowState): void {
  try {
    localStorage.setItem(
      PREFIX + flowId,
      JSON.stringify({ flowId, stepIndex, state } satisfies PersistedFlow),
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearFlow(flowId: string): void {
  try {
    localStorage.removeItem(PREFIX + flowId);
  } catch {
    /* ignore */
  }
}

const DONE_KEY = "siteos.done";

export function loadDone(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (raw === null) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function markDone(taskId: string): void {
  const done = loadDone();
  done[taskId] = true;
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(done));
  } catch {
    /* ignore */
  }
}

export function isDone(taskId: string): boolean {
  return loadDone()[taskId] === true;
}
