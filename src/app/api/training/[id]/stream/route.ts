import { NextRequest } from "next/server";
import { activeJobs } from "@/lib/training-store";

/**
 * GET /api/training/[id]/stream
 * Stream training logs via Server-Sent Events
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  const job = activeJobs.get(jobId);

  if (!job) {
    return new Response(
      JSON.stringify({ error: "Job not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let lastIndex = 0;
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "status", status: job.status })}\n\n`)
      );

      // Send existing logs
      for (const log of job.logs) {
        const event = parseLogLine(log);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      lastIndex = job.logs.length;

      // Poll for new logs
      intervalId = setInterval(() => {
        const currentJob = activeJobs.get(jobId);
        if (!currentJob) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Job no longer exists" })}\n\n`)
          );
          controller.close();
          clearInterval(intervalId);
          return;
        }

        // Send new logs
        if (currentJob.logs.length > lastIndex) {
          for (let i = lastIndex; i < currentJob.logs.length; i++) {
            const event = parseLogLine(currentJob.logs[i]);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
          lastIndex = currentJob.logs.length;
        }

        // Send status update if changed
        if (currentJob.status !== "running") {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "status", status: currentJob.status })}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
          clearInterval(intervalId);

          // Clean up completed job after a delay
          setTimeout(() => {
            activeJobs.delete(jobId);
          }, 60000); // Keep for 1 minute after completion
        }
      }, 100); // Check every 100ms
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// Format ETA seconds into human-readable string
function formatETA(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

// Parse a log line and extract metrics if present
function parseLogLine(line: string): {
  type: "log" | "metric" | "error" | "checkpoint_sample";
  message?: string;
  level?: "info" | "warn" | "error";
  step?: number;
  totalSteps?: number;
  loss?: number;
  reward?: number;
  learningRate?: number;
  tokensPerSecond?: number;
  wallClockTimeMs?: number;
  etaSeconds?: number;
  tokenCount?: number;
  checkpointPath?: string;
  checkpointLabel?: string;
  prompt?: string;
  response?: string;
} {
  // Check for structured metric line (JSON format)
  if (line.startsWith("METRIC::")) {
    try {
      const jsonStr = line.substring(8); // Remove "METRIC::" prefix
      const data = JSON.parse(jsonStr);
      return {
        type: "metric",
        message: `Step ${data.step}/${data.total_steps} | Loss: ${data.loss.toFixed(4)} | LR: ${data.lr.toExponential(2)} | ${data.tokens_per_second.toFixed(1)} tok/s | ETA: ${formatETA(data.eta_seconds)}`,
        level: "info",
        step: data.step,
        totalSteps: data.total_steps,
        loss: data.loss,
        reward: data.reward,
        learningRate: data.lr,
        tokensPerSecond: data.tokens_per_second,
        wallClockTimeMs: data.wall_clock_time_ms,
        etaSeconds: data.eta_seconds,
        tokenCount: data.tokens,
      };
    } catch {
      return { type: "log", message: line, level: "info" };
    }
  }

  // Check for checkpoint sample event
  if (line.startsWith("CHECKPOINT_SAMPLE::")) {
    try {
      const jsonStr = line.substring(19); // Remove "CHECKPOINT_SAMPLE::" prefix
      const data = JSON.parse(jsonStr);
      return {
        type: "checkpoint_sample",
        step: data.step,
        checkpointPath: data.sampler_path || data.checkpoint_path,
        checkpointLabel: data.checkpoint_label,
        prompt: data.prompt,
        response: data.response,
      };
    } catch {
      return { type: "log", message: line, level: "info" };
    }
  }

  // Check if it's an error line
  if (line.startsWith("[ERROR]")) {
    return {
      type: "error",
      message: line.replace("[ERROR] ", ""),
      level: "error",
    };
  }

  // Try to parse metrics from legacy training output (fallback)
  // Format: "Step X/Y | Loss: Z | LR: W" or "Step X/Y | Loss: Z | Reward: R | LR: W"
  const stepMatch = line.match(/Step (\d+)\/(\d+)/);
  const lossMatch = line.match(/Loss: ([\d.]+)/);
  const rewardMatch = line.match(/Reward: ([\d.]+)/);
  const lrMatch = line.match(/LR: ([\d.e+-]+)/);

  if (stepMatch && lossMatch) {
    return {
      type: "metric",
      message: line,
      level: "info",
      step: parseInt(stepMatch[1]),
      totalSteps: parseInt(stepMatch[2]),
      loss: parseFloat(lossMatch[1]),
      reward: rewardMatch ? parseFloat(rewardMatch[1]) : undefined,
      learningRate: lrMatch ? parseFloat(lrMatch[1]) : undefined,
    };
  }

  // Regular log line
  return {
    type: "log",
    message: line,
    level: line.toLowerCase().includes("error") ? "error" :
           line.toLowerCase().includes("warn") ? "warn" : "info",
  };
}
