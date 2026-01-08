import { ChildProcess } from "child_process";
import { PipelineConfig } from "./types";

export interface TrainingJob {
  process: ChildProcess;
  config: PipelineConfig;
  startedAt: number;
  logs: string[];
  status: "running" | "completed" | "failed" | "cancelled";
  apiKey: string; // Track which API key owns this job for authorization
}

// Use global to persist across hot reloads in development
// In production, this would be Redis or a database
const globalForTraining = globalThis as unknown as {
  activeJobs: Map<string, TrainingJob> | undefined;
};

export const activeJobs = globalForTraining.activeJobs ?? new Map<string, TrainingJob>();

if (process.env.NODE_ENV !== "production") {
  globalForTraining.activeJobs = activeJobs;
}
