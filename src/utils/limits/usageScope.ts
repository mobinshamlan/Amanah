import { AsyncLocalStorage } from "node:async_hooks";

// Request context only. The counters themselves live in Postgres.
export type UsageScope = {
  ipKey: string;
  reportId: string | null;
};

const storage = new AsyncLocalStorage<UsageScope>();

export function currentUsageScope() {
  return storage.getStore() ?? null;
}

export function runWithUsageScope<T>(scope: UsageScope, run: () => Promise<T>) {
  return storage.run(scope, run);
}

export function runWithReportUsage<T>(reportId: string, run: () => Promise<T>) {
  const parent = currentUsageScope();
  return runWithUsageScope({ ipKey: parent?.ipKey ?? "unknown", reportId }, run);
}
