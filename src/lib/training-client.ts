import { useStudioStore } from "./store";
import { PipelineConfig, TrainingJob, Model } from "./types";

/**
 * Training Client
 * Handles communication with the training API and SSE streaming
 */

let currentEventSource: EventSource | null = null;

export async function startTraining(config: PipelineConfig, apiKey: string, model?: Model): Promise<string | null> {
  const store = useStudioStore.getState();

  try {
    // Start the training job
    const response = await fetch("/api/training/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey,
        config,
        model,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      store.setExecutionError(data.error || "Failed to start training");
      return null;
    }

    const jobId = data.data.jobId;

    // Create training job record
    const job: TrainingJob = {
      id: jobId,
      status: "running",
      config,
      startedAt: Date.now(),
      currentStep: 0,
      totalSteps: 0,
    };
    store.addTrainingJob(job);

    // Start the execution in the store
    store.startExecution(jobId);

    // Connect to SSE stream
    connectToStream(jobId);

    return jobId;
  } catch (error) {
    store.setExecutionError("Network error. Please check your connection.");
    return null;
  }
}

export function connectToStream(jobId: string) {
  const store = useStudioStore.getState();

  // Close any existing connection
  if (currentEventSource) {
    currentEventSource.close();
  }

  // Create new EventSource connection
  currentEventSource = new EventSource(`/api/training/${jobId}/stream`);

  currentEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleStreamEvent(data, jobId);
    } catch (error) {
      console.error("Error parsing SSE event:", error);
    }
  };

  currentEventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
    const store = useStudioStore.getState();

    // Only set error if we're still running
    if (store.execution.status === "running") {
      store.addLog({
        level: "error",
        message: "Lost connection to training server",
      });
    }

    currentEventSource?.close();
    currentEventSource = null;
  };
}

function handleStreamEvent(
  data: {
    type: "log" | "metric" | "error" | "status" | "done" | "checkpoint_sample";
    message?: string;
    level?: "info" | "warn" | "error";
    status?: string;
    step?: number;
    totalSteps?: number;
    loss?: number;
    reward?: number;
    learningRate?: number;
    // New fields
    tokensPerSecond?: number;
    wallClockTimeMs?: number;
    etaSeconds?: number;
    tokenCount?: number;
    checkpointPath?: string;
    prompt?: string;
    response?: string;
  },
  jobId: string
) {
  const store = useStudioStore.getState();

  switch (data.type) {
    case "log":
      store.addLog({
        level: data.level || "info",
        message: data.message || "",
      });
      break;

    case "metric":
      // Add to logs
      store.addLog({
        level: "info",
        message: data.message || "",
      });

      // Add to metrics chart
      if (data.step !== undefined && data.loss !== undefined) {
        store.addMetric({
          step: data.step,
          loss: data.loss,
          reward: data.reward,
          learningRate: data.learningRate,
          tokensPerSecond: data.tokensPerSecond,
          wallClockTimeMs: data.wallClockTimeMs,
          etaSeconds: data.etaSeconds,
          tokenCount: data.tokenCount,
        });

        // Update progress
        if (data.totalSteps) {
          store.setExecutionProgress(data.step, data.totalSteps);
        }
      }
      break;

    case "checkpoint_sample":
      // Add checkpoint sample to store
      if (data.step !== undefined && data.checkpointPath && data.prompt && data.response) {
        store.addCheckpointSample({
          step: data.step,
          checkpointPath: data.checkpointPath,
          prompt: data.prompt,
          response: data.response,
        });
        store.addLog({
          level: "info",
          message: `Checkpoint sample generated at step ${data.step}`,
        });
      }
      break;

    case "error":
      store.addLog({
        level: "error",
        message: data.message || "Unknown error",
      });
      break;

    case "status":
      if (data.status === "completed") {
        store.setExecutionStatus("completed");
        store.updateTrainingJob(jobId, {
          status: "completed",
          completedAt: Date.now(),
          finalLoss: store.execution.metrics[store.execution.metrics.length - 1]?.loss,
        });
      } else if (data.status === "failed" || data.status === "cancelled") {
        store.setExecutionStatus("error");
        store.updateTrainingJob(jobId, {
          status: data.status === "cancelled" ? "cancelled" : "failed",
          completedAt: Date.now(),
        });
      }
      break;

    case "done":
      // Close the connection
      currentEventSource?.close();
      currentEventSource = null;
      break;
  }
}

export async function stopTraining(jobId: string): Promise<boolean> {
  const store = useStudioStore.getState();

  try {
    const response = await fetch(`/api/training/${jobId}/stop`, {
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      store.addLog({
        level: "warn",
        message: "Stop requested. Waiting for current step to complete...",
      });
      return true;
    } else {
      store.addLog({
        level: "error",
        message: data.error || "Failed to stop training",
      });
      return false;
    }
  } catch (error) {
    store.addLog({
      level: "error",
      message: "Network error while stopping training",
    });
    return false;
  }
}

export function disconnectFromStream() {
  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }
}
