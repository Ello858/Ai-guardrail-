const configuredApiBase = import.meta.env["VITE_API_BASE"] || "http://127.0.0.1:5000";
export const API_BASE = configuredApiBase.replace(/\/+$/, "");

export type Vote = {
  agent: string;
  flagged: boolean;
  reason: string;
  mem_before_mb?: number;
  mem_after_mb?: number;
  mem_delta_mb?: number;
};
export type Executor = {
  decision: string;
  summary: string;
  flagged_count?: number;
  total_agents?: number;
};
export type LogRecord = {
  request: string;
  response: string;
  votes: Vote[];
  executor: Executor;
  timestamp: string;
  contained: boolean;
};
export type ProcessResult = Omit<LogRecord, "response"> & { response: string | null };
export type SystemStatus = { contained: boolean; request_count: number };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      typeof payload?.error === "string" ? payload.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export const getLog = () => call<LogRecord[]>("/log");
export const getStatus = () => call<SystemStatus>("/status");
export const processPrompt = (prompt: string) =>
  call<ProcessResult>("/process", { method: "POST", body: JSON.stringify({ prompt }) });
export const killSwitch = () => call<{ contained: boolean }>("/kill-switch", { method: "POST" });
export const resetSystem = () => call<{ contained: boolean }>("/reset", { method: "POST" });
